import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Brain, CheckCircle2, FileText, GitBranch, ListChecks } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTrackedMutation } from '../features/ai-generation/useTrackedMutation';
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
import {
  ErrorMessage,
  ProgressLine,
  QuizSection,
  SummarySection,
  TransferSection,
} from '../features/verification/VerificationUI';
import { useBreadcrumb } from '../shared/layout/BreadcrumbContext';
import { Button } from '../shared/ui/Button';

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

  const completeStepMutation = useMutation({
    mutationFn: (options: { force?: boolean } = {}) => completeStep(goalId, stepId, options),
    onSuccess(updatedGoal) {
      queryClient.setQueryData(goalOptions.queryKey, updatedGoal);
      void queryClient.invalidateQueries({ queryKey: goalsOptions.queryKey });
      void navigate({ to: '/goals/$goalId', params: { goalId: updatedGoal.id } });
    },
  });

  const trackedArgs = {
    scope: { goalId, stepId },
    stepTitle: step?.title,
    verificationQueryKey: verificationOptions.queryKey,
  };

  const generateQuizMutation = useTrackedMutation({
    ...trackedArgs,
    taskId: `step:${stepId}:quiz`,
    title: '生成综合测验',
    run: () => generateQuiz({ goalId, stepId }),
    successDescription: (quiz) => `已生成 ${quiz.questions.length} 道题`,
    onSuccess(quiz) {
      setQuizAnswers(Object.fromEntries(quiz.questions.map((question) => [question.id, ''])));
    },
  });

  const submitQuizMutation = useTrackedMutation({
    ...trackedArgs,
    taskId: `step:${stepId}:quiz-review`,
    title: '批改综合测验',
    run: () => {
      if (!verification?.quiz) throw new Error('请先生成测验。');
      return submitQuizAttempt({
        quizId: verification.quiz.id,
        answers: verification.quiz.questions.map((question) => ({
          questionId: question.id,
          answer: quizAnswers[question.id]?.trim() ?? '',
        })),
      });
    },
    successDescription: '测验批改完成',
  });

  const generateTransferMutation = useTrackedMutation({
    ...trackedArgs,
    taskId: `step:${stepId}:transfer`,
    title: '生成迁移应用题',
    run: () => generateTransfer({ goalId, stepId }),
    successDescription: '迁移应用题已生成',
  });

  const submitTransferMutation = useTrackedMutation({
    ...trackedArgs,
    taskId: `step:${stepId}:transfer-review`,
    title: '评价迁移应用',
    run: () => submitTransfer({ goalId, stepId, content: transferDraft.trim() }),
    successDescription: '迁移应用评价完成',
    onSuccess() {
      setTransferDraft('');
    },
  });

  const generateSummaryMutation = useTrackedMutation({
    ...trackedArgs,
    taskId: `step:${stepId}:summary`,
    title: '生成本节总结',
    run: () => generateStepSummary({ goalId, stepId }),
    successDescription: '本节总结已生成',
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
            <QuizSection
              quiz={verification?.quiz}
              latestAttempt={verification?.latestAttempt}
              quizAnswers={quizAnswers}
              onAnswerChange={(questionId, value) =>
                setQuizAnswers((current) => ({ ...current, [questionId]: value }))
              }
              onSubmit={handleQuizSubmit}
              isGenerating={generateQuizMutation.isPending}
              isSubmitting={submitQuizMutation.isPending}
              generateError={
                generateQuizMutation.isError ? generateQuizMutation.error.message : undefined
              }
              submitError={
                submitQuizMutation.isError ? submitQuizMutation.error.message : undefined
              }
              onRetryGenerate={() => generateQuizMutation.mutate()}
            />
          )}

          {activeStage === 'transfer' && (
            <TransferSection
              transfer={verification?.transfer}
              draft={transferDraft}
              onDraftChange={setTransferDraft}
              onSubmit={handleTransferSubmit}
              isGenerating={generateTransferMutation.isPending}
              isSubmitting={submitTransferMutation.isPending}
              generateError={
                generateTransferMutation.isError
                  ? generateTransferMutation.error.message
                  : undefined
              }
              submitError={
                submitTransferMutation.isError ? submitTransferMutation.error.message : undefined
              }
              onRetryGenerate={() => generateTransferMutation.mutate()}
            />
          )}

          {activeStage === 'summary' && (
            <SummarySection
              summary={verification?.summary}
              isGenerating={generateSummaryMutation.isPending}
              generateError={
                generateSummaryMutation.isError ? generateSummaryMutation.error.message : undefined
              }
              onGenerate={() => generateSummaryMutation.mutate()}
            />
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
