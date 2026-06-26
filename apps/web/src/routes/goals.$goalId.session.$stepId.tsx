import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Brain, CheckCircle2, FileText, GitBranch, ListChecks } from 'lucide-react';
import type { FormEvent } from 'react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { runQueuedAIGenerationTask } from '../features/ai-generation/aiGenerationQueue';
import { useAIGenerationStore } from '../features/ai-generation/aiGenerationStore';
import { ChatPanel } from '../features/chat/ChatPanel';
import {
  completeStep,
  generateQuiz,
  generateStepSummary,
  generateTransfer,
  submitQuizAttempt,
  submitTransfer,
} from '../features/goal/api';
import { mockGoals } from '../features/goal/mockGoals';
import {
  goalQueryOptions,
  goalsQueryOptions,
  stepVerificationQueryOptions,
} from '../features/goal/queries';
import { useBreadcrumb } from '../shared/layout/BreadcrumbContext';
import { Button } from '../shared/ui/Button';

const MarkdownRenderer = lazy(() =>
  import('../features/chat/MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })),
);

export const Route = createFileRoute('/goals/$goalId/session/$stepId')({
  component: LearningSessionPage,
});

type VerificationStage = 'learning' | 'quiz' | 'transfer' | 'summary';

const stages: Array<{
  id: VerificationStage;
  label: string;
  icon: typeof Brain;
}> = [
  { id: 'learning', label: '学习', icon: Brain },
  { id: 'quiz', label: '测验', icon: ListChecks },
  { id: 'transfer', label: '迁移', icon: GitBranch },
  { id: 'summary', label: '总结', icon: FileText },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'AI 生成失败，请稍后重试。';
}

function LearningSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { goalId, stepId } = Route.useParams();
  const fallbackGoal = mockGoals.find((item) => item.id === goalId);
  const goalOptions = goalQueryOptions(goalId);
  const goalsOptions = goalsQueryOptions();
  const verificationOptions = stepVerificationQueryOptions(stepId);
  const goalQuery = useQuery(goalOptions);
  const verificationQuery = useQuery(verificationOptions);
  const goal = goalQuery.data ?? (goalQuery.isError ? fallbackGoal : undefined);
  const verification = verificationQuery.data;
  const [activeStage, setActiveStage] = useState<VerificationStage>('learning');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [transferDraft, setTransferDraft] = useState('');
  const step = goal?.steps.find((item) => item.id === stepId);
  const upsertTask = useAIGenerationStore((state) => state.upsertTask);
  const setTaskStatus = useAIGenerationStore((state) => state.setTaskStatus);
  const setPanelOpen = useAIGenerationStore((state) => state.setPanelOpen);

  const completeStepMutation = useMutation({
    mutationFn: (options: { force?: boolean } = {}) => completeStep(goalId, stepId, options),
    onSuccess(updatedGoal) {
      queryClient.setQueryData(goalOptions.queryKey, updatedGoal);
      void queryClient.invalidateQueries({ queryKey: goalsOptions.queryKey });
      void navigate({ to: '/goals/$goalId', params: { goalId: updatedGoal.id } });
    },
  });

  const refreshVerification = () =>
    queryClient.invalidateQueries({ queryKey: verificationOptions.queryKey });

  const generateQuizTaskId = `step:${stepId}:quiz`;
  const submitQuizTaskId = `step:${stepId}:quiz-review`;
  const generateTransferTaskId = `step:${stepId}:transfer`;
  const submitTransferTaskId = `step:${stepId}:transfer-review`;
  const generateSummaryTaskId = `step:${stepId}:summary`;

  const generateQuizMutation = useMutation({
    mutationFn: () =>
      runQueuedAIGenerationTask(generateQuizTaskId, () => generateQuiz({ goalId, stepId })),
    onMutate() {
      upsertTask({
        id: generateQuizTaskId,
        title: '生成综合测验',
        description: step?.title ?? '当前学习 Step',
        status: 'queued',
        scope: { goalId, stepId },
      });
      setPanelOpen(true);
    },
    onSuccess(quiz) {
      setTaskStatus(generateQuizTaskId, 'done', {
        description: `已生成 ${quiz.questions.length} 道题`,
      });
      setQuizAnswers(Object.fromEntries(quiz.questions.map((question) => [question.id, ''])));
      void refreshVerification();
    },
    onError(error) {
      setTaskStatus(generateQuizTaskId, 'failed', { error: getErrorMessage(error) });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: () =>
      runQueuedAIGenerationTask(submitQuizTaskId, () => {
        if (!verification?.quiz) {
          throw new Error('请先生成测验。');
        }
        return submitQuizAttempt({
          quizId: verification.quiz.id,
          answers: verification.quiz.questions.map((question) => ({
            questionId: question.id,
            answer: quizAnswers[question.id]?.trim() ?? '',
          })),
        });
      }),
    onMutate() {
      upsertTask({
        id: submitQuizTaskId,
        title: '批改综合测验',
        description: step?.title ?? '当前学习 Step',
        status: 'queued',
        scope: { goalId, stepId },
      });
      setPanelOpen(true);
    },
    onSuccess() {
      setTaskStatus(submitQuizTaskId, 'done', { description: '测验批改完成' });
      void refreshVerification();
    },
    onError(error) {
      setTaskStatus(submitQuizTaskId, 'failed', { error: getErrorMessage(error) });
    },
  });

  const generateTransferMutation = useMutation({
    mutationFn: () =>
      runQueuedAIGenerationTask(generateTransferTaskId, () => generateTransfer({ goalId, stepId })),
    onMutate() {
      upsertTask({
        id: generateTransferTaskId,
        title: '生成迁移应用题',
        description: step?.title ?? '当前学习 Step',
        status: 'queued',
        scope: { goalId, stepId },
      });
      setPanelOpen(true);
    },
    onSuccess() {
      setTaskStatus(generateTransferTaskId, 'done', { description: '迁移应用题已生成' });
      void refreshVerification();
    },
    onError(error) {
      setTaskStatus(generateTransferTaskId, 'failed', { error: getErrorMessage(error) });
    },
  });

  const submitTransferMutation = useMutation({
    mutationFn: () =>
      runQueuedAIGenerationTask(submitTransferTaskId, () =>
        submitTransfer({ goalId, stepId, content: transferDraft.trim() }),
      ),
    onMutate() {
      upsertTask({
        id: submitTransferTaskId,
        title: '评价迁移应用',
        description: step?.title ?? '当前学习 Step',
        status: 'queued',
        scope: { goalId, stepId },
      });
      setPanelOpen(true);
    },
    onSuccess() {
      setTaskStatus(submitTransferTaskId, 'done', { description: '迁移应用评价完成' });
      setTransferDraft('');
      void refreshVerification();
    },
    onError(error) {
      setTaskStatus(submitTransferTaskId, 'failed', {
        error: getErrorMessage(error),
      });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: () =>
      runQueuedAIGenerationTask(generateSummaryTaskId, () =>
        generateStepSummary({ goalId, stepId }),
      ),
    onMutate() {
      upsertTask({
        id: generateSummaryTaskId,
        title: '生成本节总结',
        description: step?.title ?? '当前学习 Step',
        status: 'queued',
        scope: { goalId, stepId },
      });
      setPanelOpen(true);
    },
    onSuccess() {
      setTaskStatus(generateSummaryTaskId, 'done', { description: '本节总结已生成' });
      void refreshVerification();
    },
    onError(error) {
      setTaskStatus(generateSummaryTaskId, 'failed', { error: getErrorMessage(error) });
    },
  });

  // Auto-generate quiz when entering quiz stage
  useEffect(() => {
    if (activeStage !== 'quiz') return;
    if (verification?.quiz) return;
    if (generateQuizMutation.isPending) return;
    generateQuizMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, verification?.quiz]);

  // Auto-generate transfer prompt when entering transfer stage
  useEffect(() => {
    if (activeStage !== 'transfer') return;
    if (verification?.transfer) return;
    if (generateTransferMutation.isPending) return;
    generateTransferMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, verification?.transfer]);

  useEffect(() => {
    const quiz = verification?.quiz;
    if (!quiz) return;
    setQuizAnswers((current) => ({
      ...Object.fromEntries(quiz.questions.map((question) => [question.id, ''])),
      ...current,
    }));
  }, [verification?.quiz]);

  useBreadcrumb([
    { label: '学习目标', href: '/goals' },
    { label: goal?.title ?? '', href: `/goals/${goalId}` },
    { label: step?.title ?? '' },
  ]);

  if (!goal || !step) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">没有找到这个学习 Session。</p>
        <Link
          className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          to="/"
        >
          返回工作台
        </Link>
      </div>
    );
  }

  const handleQuizSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verification?.quiz || submitQuizMutation.isPending) return;
    const hasEmptyAnswer = verification.quiz.questions.some(
      (question) => !quizAnswers[question.id]?.trim(),
    );
    if (hasEmptyAnswer) return;
    submitQuizMutation.mutate();
  };

  const handleTransferSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (transferDraft.trim().length < 10 || submitTransferMutation.isPending) return;
    submitTransferMutation.mutate();
  };

  const activeStageIndex = stages.findIndex((stage) => stage.id === activeStage);
  const unfinishedVerificationLabels = [
    !verification?.latestAttempt ? '综合测验' : '',
    !verification?.transfer?.userAnswer ? '迁移应用' : '',
    !verification?.summary ? '学习总结' : '',
  ].filter(Boolean);
  const completedSteps = goal.steps.filter((s) => s.status === 'done').length;
  const nextStep = goal.steps.find((s) => s.status === 'todo');
  const handleCompleteStep = () => {
    if (step.status === 'done' || completeStepMutation.isPending) return;

    if (unfinishedVerificationLabels.length > 0) {
      const confirmed = window.confirm(
        [
          '本节还有环节没有完成。',
          `未完成：${unfinishedVerificationLabels.join('、')}`,
          '提前完成后，系统会把当前 Step 标记为已完成，并进入后续学习路径；未完成的测验、迁移应用或总结可以之后再回来补。',
          '确定要提前完成本节吗？',
        ].join('\n\n'),
      );
      if (!confirmed) return;
    }

    completeStepMutation.mutate({ force: unfinishedVerificationLabels.length > 0 });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <main className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-2">
            <div className="grid grid-cols-4 gap-1">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = stage.id === activeStage;
                const isDone =
                  stage.id === 'learning' ||
                  (stage.id === 'quiz' && verification?.latestAttempt) ||
                  (stage.id === 'transfer' && verification?.transfer?.userAnswer) ||
                  (stage.id === 'summary' && verification?.summary);

                return (
                  <button
                    className={
                      'flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ' +
                      (isActive
                        ? 'bg-blue-600 text-white'
                        : isDone
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'text-gray-500 hover:bg-gray-50')
                    }
                    key={stage.id}
                    onClick={() => setActiveStage(stage.id)}
                    type="button"
                  >
                    <Icon size={15} />
                    <span>{index + 1}</span>
                    <span className="hidden sm:inline">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeStage === 'learning' && <ChatPanel goal={goal} step={step} />}

          {activeStage === 'quiz' && (
            <section className="rounded-lg border border-gray-200 bg-white p-6">
              <SectionHeader
                description="完成以下三类题目：整体理解复述、概念判断、场景应用。"
                label="Quiz"
                title="综合测验"
              />
              {!verification?.quiz ? (
                <div className="mt-5">
                  {generateQuizMutation.isError ? (
                    <div className="space-y-3">
                      <ErrorMessage message={generateQuizMutation.error.message} />
                      <Button onClick={() => generateQuizMutation.mutate()} size="md">
                        重试
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">AI 正在生成测验题目...</p>
                  )}
                </div>
              ) : (
                <form className="mt-5 divide-y divide-gray-100" onSubmit={handleQuizSubmit}>
                  {verification.quiz.questions.map((question, index) => (
                    <div className="py-5 first:pt-0" key={question.id}>
                      <div className="mb-2">
                        <QuestionTypeBadge type={question.type} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {index + 1}. {question.question}
                      </p>
                      {question.type === 'single_choice' ? (
                        <div className="mt-3 space-y-2">
                          {question.options?.map((option) => (
                            <label
                              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md bg-gray-50 px-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                              key={option}
                            >
                              <input
                                checked={quizAnswers[question.id] === option}
                                className="size-4"
                                name={question.id}
                                onChange={() =>
                                  setQuizAnswers((current) => ({
                                    ...current,
                                    [question.id]: option,
                                  }))
                                }
                                type="radio"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          className="mt-3 min-h-28 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
                          onChange={(event) =>
                            setQuizAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder={
                            question.type === 'explain_back'
                              ? '用自己的话讲一遍，不要复制 AI 的原文...'
                              : '结合具体场景分析...'
                          }
                          value={quizAnswers[question.id] ?? ''}
                        />
                      )}
                      {verification.latestAttempt?.answers.find(
                        (answer) => answer.questionId === question.id,
                      ) && (
                        <AttemptFeedback
                          answer={verification.latestAttempt.answers.find(
                            (item) => item.questionId === question.id,
                          )}
                        />
                      )}
                    </div>
                  ))}
                  <div className="pt-5">
                    <Button
                      disabled={
                        submitQuizMutation.isPending ||
                        verification.quiz.questions.some(
                          (question) => !quizAnswers[question.id]?.trim(),
                        )
                      }
                      icon={<CheckCircle2 size={15} />}
                      size="md"
                      type="submit"
                    >
                      {submitQuizMutation.isPending ? '批改中...' : '提交测验'}
                    </Button>
                    {verification.latestAttempt && (
                      <p className="text-sm font-medium text-gray-700">
                        最近一次测验得分：{verification.latestAttempt.score} 分
                      </p>
                    )}
                    {submitQuizMutation.isError && (
                      <ErrorMessage message={submitQuizMutation.error.message} />
                    )}
                  </div>
                </form>
              )}
            </section>
          )}

          {activeStage === 'transfer' && (
            <section className="rounded-lg border border-gray-200 bg-white p-6">
              <SectionHeader
                description="把本节知识迁移到真实场景，考察能否在新情境中运用。"
                label="Transfer / Application"
                title="迁移应用"
              />
              {!verification?.transfer ? (
                <div className="mt-5">
                  {generateTransferMutation.isError ? (
                    <div className="space-y-3">
                      <ErrorMessage message={generateTransferMutation.error.message} />
                      <Button onClick={() => generateTransferMutation.mutate()} size="md">
                        重试
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">AI 正在生成迁移应用题...</p>
                  )}
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                      场景题目
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-blue-900 whitespace-pre-wrap">
                      {verification.transfer.prompt}
                    </p>
                  </div>

                  {!verification.transfer.userAnswer ? (
                    <form onSubmit={handleTransferSubmit} className="space-y-4">
                      <textarea
                        className="min-h-40 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
                        onChange={(event) => setTransferDraft(event.target.value)}
                        placeholder="基于本节所学，分析场景中的问题..."
                        value={transferDraft}
                      />
                      <Button
                        disabled={
                          transferDraft.trim().length < 10 || submitTransferMutation.isPending
                        }
                        icon={<GitBranch size={15} />}
                        size="md"
                        type="submit"
                      >
                        {submitTransferMutation.isPending ? '评价中...' : '提交答案'}
                      </Button>
                      {submitTransferMutation.isError && (
                        <ErrorMessage message={submitTransferMutation.error.message} />
                      )}
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                          你的回答
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                          {verification.transfer.userAnswer}
                        </p>
                      </div>
                      {verification.transfer.aiFeedback && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-900">AI 反馈</p>
                            {verification.transfer.score !== undefined && (
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                {verification.transfer.score} 分
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-gray-700">
                            {verification.transfer.aiFeedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {activeStage === 'summary' && (
            <section className="rounded-lg border border-gray-200 bg-white p-6">
              <SectionHeader
                description="把本节教学、测验和迁移应用沉淀成一份学习总结。"
                label="Summary"
                title="本节总结"
              />
              {!verification?.summary ? (
                <Button
                  className="mt-5"
                  disabled={generateSummaryMutation.isPending}
                  icon={<FileText size={15} />}
                  onClick={() => generateSummaryMutation.mutate()}
                  size="md"
                >
                  {generateSummaryMutation.isPending ? '生成中...' : '生成总结'}
                </Button>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    <Suspense fallback={<p className="text-gray-400">渲染中...</p>}>
                      <MarkdownRenderer content={verification.summary.content} />
                    </Suspense>
                  </div>
                  <FeedbackList title="关键收获" items={verification.summary.keyTakeaways} />
                  <FeedbackList title="薄弱点" items={verification.summary.weakPoints} />
                  <FeedbackList title="下一步建议" items={verification.summary.nextSuggestions} />
                </div>
              )}
              {generateSummaryMutation.isError && (
                <ErrorMessage message={generateSummaryMutation.error.message} />
              )}
            </section>
          )}
        </main>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">当前进度</p>
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 truncate pr-2">{goal.title}</span>
                  <span className="shrink-0 text-gray-500">{goal.progress}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: goal.progress + '%' }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {completedSteps}/{goal.steps.length} 步完成
              </p>
            </div>

            <hr className="mx-4 border-gray-100" />

            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">验证进度</p>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <ProgressLine done={Boolean(verification?.latestAttempt)} label="综合测验" />
                <ProgressLine done={Boolean(verification?.transfer?.userAnswer)} label="迁移应用" />
                <ProgressLine done={Boolean(verification?.summary)} label="学习总结" />
              </div>
            </div>

            <hr className="mx-4 border-gray-100" />

            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">当前阶段</p>
              <p className="mt-1.5 text-sm font-medium text-gray-800">
                {activeStageIndex + 1}. {stages[activeStageIndex]?.label}
              </p>
              {verification?.latestAttempt && (
                <p className="mt-2 text-xs text-gray-500">
                  测验 {verification.latestAttempt.score} 分
                </p>
              )}
              {verification?.transfer?.score !== undefined && (
                <p className="mt-1 text-xs text-gray-500">迁移 {verification.transfer.score} 分</p>
              )}
            </div>

            {nextStep && (
              <>
                <hr className="mx-4 border-gray-100" />
                <div className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    下一步
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-gray-800">{nextStep.title}</p>
                </div>
              </>
            )}
          </div>

          <Button
            className="w-full justify-center"
            disabled={step.status === 'done' || completeStepMutation.isPending}
            icon={<CheckCircle2 size={15} />}
            onClick={handleCompleteStep}
            size="md"
          >
            {step.status === 'done' ? '已完成' : '完成本节'}
          </Button>
          {completeStepMutation.isError && (
            <ErrorMessage message={completeStepMutation.error.message} />
          )}
        </aside>
      </div>
    </div>
  );
}

function QuestionTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    explain_back: { label: 'Explain Back', className: 'bg-purple-50 text-purple-600' },
    single_choice: { label: 'Concept Check', className: 'bg-blue-50 text-blue-600' },
    scenario_question: { label: 'Scenario', className: 'bg-amber-50 text-amber-600' },
  };
  const config = map[type] ?? { label: type, className: 'bg-gray-100 text-gray-500' };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function SectionHeader({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <div className="border-b border-gray-100 pb-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <h2 className="mt-2 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}

function FeedbackList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-700">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gray-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressLine({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={'size-2 rounded-full ' + (done ? 'bg-emerald-500' : 'bg-gray-200')} />
      <span>{label}</span>
    </div>
  );
}

function AttemptFeedback({
  answer,
}: {
  answer:
    | {
        isCorrect: boolean;
        feedback: string;
      }
    | undefined;
}) {
  if (!answer) return null;

  return (
    <div
      className={
        'mt-3 rounded-md border px-3 py-2 text-sm ' +
        (answer.isCorrect
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-amber-100 bg-amber-50 text-amber-800')
      }
    >
      {answer.feedback}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}
