import type { Quiz, QuizAttemptAnswer, StepSummary, Transfer } from '@pathmind/shared';
import { CheckCircle2, FileText, GitBranch } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '../../shared/ui/Button';
import { StreamingMarkdown } from '../ai-generation/StreamingMarkdown';
import { StreamingOutputBlock } from '../ai-generation/StreamingOutputBlock';
import { LazyMarkdownRenderer } from '../chat/LazyMarkdownRenderer';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export function SectionHeader({
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

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

export function FeedbackList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-sm font-medium uppercase tracking-wider text-gray-400">{title}</p>
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

export function ProgressLine({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={'size-2 rounded-full ' + (done ? 'bg-emerald-500' : 'bg-gray-200')} />
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz section
// ---------------------------------------------------------------------------

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

function AttemptFeedback({
  answer,
}: {
  answer: Pick<QuizAttemptAnswer, 'isCorrect' | 'feedback'> | undefined;
}) {
  if (!answer) return null;

  return (
    <div
      className={
        'mt-3 rounded-md border px-3 py-2 ' +
        (answer.isCorrect ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50')
      }
    >
      <LazyMarkdownRenderer content={answer.feedback} />
    </div>
  );
}

function SubmittedQuizAnswer({ answer }: { answer: string }) {
  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-100 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">你的回答</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{answer}</p>
    </div>
  );
}

interface QuizSectionProps {
  quiz: Quiz | undefined;
  latestAttempt: { score: number; answers: QuizAttemptAnswer[] } | undefined;
  quizAnswers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isGenerating: boolean;
  isSubmitting: boolean;
  generateError: string | undefined;
  submitError: string | undefined;
  onRetryGenerate: () => void;
}

export function QuizSection({
  quiz,
  latestAttempt,
  quizAnswers,
  onAnswerChange,
  onSubmit,
  isGenerating,
  isSubmitting,
  generateError,
  submitError,
  onRetryGenerate,
}: QuizSectionProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <SectionHeader
        description="完成以下三类题目：整体理解复述、概念判断、场景应用。"
        label="Quiz"
        title="综合测验"
      />
      {!quiz || quiz.status === 'streaming' ? (
        <div className="mt-5">
          {generateError ? (
            <div className="space-y-3">
              <ErrorMessage message={generateError} />
              <Button onClick={onRetryGenerate} size="md">
                重试
              </Button>
            </div>
          ) : quiz?.draftContent ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">AI 正在生成测验题目...</p>
              <StreamingOutputBlock
                content={quiz.draftContent}
                placeholder="AI 正在生成测验题目..."
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {isGenerating ? 'AI 正在生成测验题目...' : 'AI 正在准备测验题目...'}
            </p>
          )}
        </div>
      ) : (
        <form className="mt-5 divide-y divide-gray-100" onSubmit={onSubmit}>
          {quiz.questions.map((question, index) => {
            const attemptAnswer = latestAttempt?.answers.find(
              (answer) => answer.questionId === question.id,
            );

            return (
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
                        className={
                          'flex min-h-9 items-center gap-2 rounded-md bg-gray-50 px-3 text-sm text-gray-700 ' +
                          (attemptAnswer
                            ? 'cursor-default'
                            : 'cursor-pointer transition-colors hover:bg-gray-100')
                        }
                        key={option}
                      >
                        <input
                          checked={
                            attemptAnswer
                              ? attemptAnswer.answer === option
                              : quizAnswers[question.id] === option
                          }
                          className="size-4"
                          disabled={Boolean(attemptAnswer)}
                          name={question.id}
                          onChange={() => onAnswerChange(question.id, option)}
                          type="radio"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : attemptAnswer ? (
                  <SubmittedQuizAnswer answer={attemptAnswer.answer} />
                ) : (
                  <textarea
                    className="mt-3 min-h-28 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
                    onChange={(event) => onAnswerChange(question.id, event.target.value)}
                    placeholder={
                      question.type === 'explain_back'
                        ? '用自己的话讲一遍，不要复制 AI 的原文...'
                        : '结合具体场景分析...'
                    }
                    value={quizAnswers[question.id] ?? ''}
                  />
                )}
                {attemptAnswer && <AttemptFeedback answer={attemptAnswer} />}
              </div>
            );
          })}
          <div className="pt-5">
            {!latestAttempt && (
              <Button
                disabled={
                  isSubmitting ||
                  quiz.questions.some((question) => !quizAnswers[question.id]?.trim())
                }
                icon={<CheckCircle2 size={15} />}
                size="md"
                type="submit"
              >
                {isSubmitting ? '批改中...' : '提交测验'}
              </Button>
            )}
            {latestAttempt && (
              <p className="mt-2 text-sm font-medium text-gray-700">
                最近一次测验得分：{latestAttempt.score} 分
              </p>
            )}
            {submitError && <ErrorMessage message={submitError} />}
          </div>
        </form>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Transfer section
// ---------------------------------------------------------------------------

interface TransferSectionProps {
  transfer: Transfer | undefined;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isGenerating: boolean;
  isSubmitting: boolean;
  generateError: string | undefined;
  submitError: string | undefined;
  onRetryGenerate: () => void;
}

export function TransferSection({
  transfer,
  draft,
  onDraftChange,
  onSubmit,
  isGenerating,
  isSubmitting,
  generateError,
  submitError,
  onRetryGenerate,
}: TransferSectionProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <SectionHeader
        description="把本节知识迁移到真实场景，考察能否在新情境中运用。"
        label="Transfer / Application"
        title="迁移应用"
      />
      {!transfer ? (
        <div className="mt-5">
          {generateError ? (
            <div className="space-y-3">
              <ErrorMessage message={generateError} />
              <Button onClick={onRetryGenerate} size="md">
                重试
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {isGenerating ? 'AI 正在生成迁移应用题...' : 'AI 正在准备迁移应用题...'}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">场景题目</p>
            <div className="mt-2">
              <StreamingMarkdown
                content={transfer.prompt}
                jsonField={transfer.promptStatus === 'streaming' ? 'prompt' : undefined}
                placeholder="AI 正在生成迁移应用题..."
              />
            </div>
          </div>

          {transfer.promptStatus === 'streaming' ? null : !transfer.userAnswer ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <textarea
                className="min-h-40 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="基于本节所学，分析场景中的问题..."
                value={draft}
              />
              <Button
                disabled={draft.trim().length < 10 || isSubmitting}
                icon={<GitBranch size={15} />}
                size="md"
                type="submit"
              >
                {isSubmitting ? '评价中...' : '提交答案'}
              </Button>
              {submitError && <ErrorMessage message={submitError} />}
            </form>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  你的回答
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                  {transfer.userAnswer}
                </p>
              </div>
              {transfer.aiFeedback && (
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium uppercase tracking-wider text-blue-400">
                      AI 反馈
                    </p>
                    {transfer.score !== undefined && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {transfer.score} 分
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <StreamingMarkdown
                      content={transfer.aiFeedback}
                      jsonField={transfer.feedbackStatus === 'streaming' ? 'feedback' : undefined}
                      placeholder="AI 正在评价迁移应用..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Summary section
// ---------------------------------------------------------------------------

interface SummarySectionProps {
  summary: StepSummary | undefined;
  isGenerating: boolean;
  generateError: string | undefined;
  onGenerate: () => void;
}

export function SummarySection({
  summary,
  isGenerating,
  generateError,
  onGenerate,
}: SummarySectionProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <SectionHeader
        description="把本节教学、测验和迁移应用沉淀成一份学习总结。"
        label="Summary"
        title="本节总结"
      />
      {!summary ? (
        <Button
          className="mt-5"
          disabled={isGenerating}
          icon={<FileText size={15} />}
          onClick={onGenerate}
          size="md"
        >
          {isGenerating ? '生成中...' : '生成总结'}
        </Button>
      ) : (
        <div className="mt-5 space-y-4">
          <StreamingMarkdown
            content={summary.content}
            jsonField={summary.status === 'streaming' ? 'content' : undefined}
            placeholder="AI 正在生成学习总结..."
          />
          {summary.status === 'complete' && (
            <>
              <FeedbackList title="关键收获" items={summary.keyTakeaways} />
              <FeedbackList title="薄弱点" items={summary.weakPoints} />
              <FeedbackList title="下一步建议" items={summary.nextSuggestions} />
            </>
          )}
        </div>
      )}
      {generateError && <ErrorMessage message={generateError} />}
    </section>
  );
}
