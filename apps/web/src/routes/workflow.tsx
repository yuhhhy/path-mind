import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, ChevronDown, Circle, Copy, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MarkdownRenderer } from '../features/chat/MarkdownRenderer';
import { createWorkflowSession, getWorkflowSessions } from '../features/workflow/api';
import type {
  AgentAction,
  WorkflowRunResult,
  WorkflowSessionStatus,
  WorkflowSessionSummary,
  WorkflowStep,
} from '../features/workflow/types';

export const Route = createFileRoute('/workflow')({
  component: WorkflowRouteLayout,
});

function WorkflowRouteLayout() {
  return <Outlet />;
}

const sessionsQueryKey = ['workflow', 'sessions'] as const;
export const sessionsQueryOptions = () =>
  queryOptions({ queryKey: sessionsQueryKey, queryFn: getWorkflowSessions });

const statusLabels: Record<WorkflowSessionStatus, string> = {
  clarifying: '正在澄清',
  planning: '正在规划',
  running: '推进中',
  waiting_user: '等你补充',
  completed: '已完成',
  failed: '遇到问题',
};

const actionLabels: Record<string, string> = {
  ask_user: '澄清目标',
  create_plan: '创建计划',
  update_plan: '调整计划',
  execute_step: '执行步骤',
  generate_content: '生成内容',
  generate_learning_path: '生成学习路径',
  create_quiz: '创建测验',
  summarize: '阶段总结',
  finalize: '整理最终结果',
  wait_user: '等待输入',
};

function getGeneratedMessageTitle(content: string, index: number) {
  const firstLine = content
    .split('\n')
    .map((line) =>
      line
        .replace(/^[#>*\-\d.\s]+/, '')
        .replace(/[*_`]/g, '')
        .trim(),
    )
    .find(Boolean);
  if (!firstLine) return `Agent 回复 ${index + 1}`;
  return firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine;
}

export function WorkflowIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [goalDraft, setGoalDraft] = useState('');
  const sessionsQuery = useQuery(sessionsQueryOptions());

  const createMutation = useMutation({
    mutationFn: createWorkflowSession,
    onSuccess(result) {
      setGoalDraft('');
      void queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      void navigate({
        to: '/workflow/$sessionId',
        params: { sessionId: result.session.id },
      });
    },
  });

  return (
    <WorkflowEmptyState
      error={createMutation.error}
      goal={goalDraft}
      isCreating={createMutation.isPending}
      isLoadingSession={false}
      onGoalChange={setGoalDraft}
      onOpenSession={(sessionId) =>
        void navigate({ to: '/workflow/$sessionId', params: { sessionId } })
      }
      onStart={() => createMutation.mutate(goalDraft.trim())}
      recentSessions={sessionsQuery.data ?? []}
    />
  );
}

interface EmptyStateProps {
  goal: string;
  recentSessions: WorkflowSessionSummary[];
  isCreating: boolean;
  isLoadingSession: boolean;
  error: Error | null;
  onGoalChange(value: string): void;
  onStart(): void;
  onOpenSession(id: string): void;
}

export function WorkflowEmptyState(props: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          开始一个 Agent Workflow
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          把一句模糊的目标推进成结果。Agent 会澄清目标、维护上下文、生成计划并持续执行。
        </p>
      </header>

      <section className="mt-8 max-w-3xl">
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="workflow-goal">
          你现在想推进什么？
        </label>
        <textarea
          className="min-h-32 w-full resize-y rounded-md border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10"
          id="workflow-goal"
          onChange={(event) => props.onGoalChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') props.onStart();
          }}
          placeholder="例如：帮我准备前端面试、包装 PathMind 简历项目、制定两周 React 学习计划"
          value={props.goal}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">⌘ Enter 开始</span>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            disabled={props.isCreating || props.goal.trim().length === 0}
            onClick={() => props.onStart()}
            type="button"
          >
            {props.isCreating && <LoaderCircle className="animate-spin" size={14} />}
            {props.isCreating ? '正在开始…' : '开始 Workflow'}
          </button>
        </div>
        {props.error && <p className="mt-3 text-sm text-red-600">{props.error.message}</p>}
      </section>

      <section className="mt-12 max-w-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-semibold text-slate-800">最近的 Workflow</h2>
          {props.recentSessions.length > 0 && (
            <span className="text-xs text-slate-400">{props.recentSessions.length} 个</span>
          )}
        </div>
        {props.recentSessions.length === 0 ? (
          <p className="py-10 text-sm text-slate-400">还没有 Workflow Session。</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {props.recentSessions.slice(0, 8).map((session) => (
              <button
                className="flex w-full items-center justify-between gap-6 px-1 py-4 text-left transition-colors hover:bg-slate-50 disabled:opacity-50"
                disabled={props.isLoadingSession}
                key={session.id}
                onClick={() => props.onOpenSession(session.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {session.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {session._count.actions} 个行动记录
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {statusLabels[session.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface WorkspaceProps {
  run: WorkflowRunResult;
  draft: string;
  isSending: boolean;
  error: Error | null;
  onDraftChange(value: string): void;
  onSend(): void;
  onNew(): void;
}

export function WorkflowWorkspace(props: WorkspaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAppliedInitialHashRef = useRef(false);
  const isCompleted = props.run.session.status === 'completed';
  useEffect(() => {
    if (!hasAppliedInitialHashRef.current) {
      hasAppliedInitialHashRef.current = true;
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [props.run.messages.length]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {props.run.session.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Agent Workflow</p>
        </div>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          onClick={() => props.onNew()}
          type="button"
        >
          新建 Session
        </button>
      </div>

      <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-[680px] min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-800">对话</h2>
            <SessionStatus status={props.run.session.status} />
          </div>
          <div className="flex-1 space-y-8 py-6">
            {props.run.messages.map((message) => (
              <div className={message.role === 'user' ? 'flex justify-end' : ''} key={message.id}>
                {message.role === 'assistant' ? (
                  <article
                    className="group relative min-w-0 scroll-mt-20 pr-10"
                    id={`workflow-message-${message.id}`}
                  >
                    <div className="mb-2 text-xs font-medium text-slate-400">Agent</div>
                    <div className="absolute top-0 right-0">
                      <CopyResultButton content={message.content} variant="message" />
                    </div>
                    <MarkdownRenderer content={message.content} />
                  </article>
                ) : (
                  <div className="max-w-[78%] rounded-lg bg-blue-50 px-4 py-3 text-sm leading-6 text-slate-800">
                    {message.content}
                  </div>
                )}
              </div>
            ))}
            {props.isSending && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="animate-spin text-blue-600" size={14} />
                Agent 正在观察状态并决定下一步…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 pt-5">
            {isCompleted ? (
              <p className="text-sm font-medium text-emerald-700">
                Workflow 已完成，最终产物已整理在右侧。
              </p>
            ) : (
              <div>
                <textarea
                  className="min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10"
                  disabled={props.isSending}
                  onChange={(event) => props.onDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      props.onSend();
                    }
                  }}
                  placeholder={
                    props.run.session.status === 'waiting_user'
                      ? '补充 Agent 需要的信息…'
                      : '继续补充要求或调整方向…'
                  }
                  value={props.draft}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Enter 发送 · Shift Enter 换行</span>
                  <button
                    aria-label="发送消息"
                    className="h-8 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={props.isSending || props.draft.trim().length === 0}
                    onClick={() => props.onSend()}
                    type="button"
                  >
                    发送
                  </button>
                </div>
              </div>
            )}
            {props.error && <p className="mt-2 text-xs text-red-600">{props.error.message}</p>}
          </div>
        </section>

        <aside className="border-t border-slate-200 pt-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <WorkflowStatePanel run={props.run} />
        </aside>
      </div>
    </div>
  );
}

export function WorkflowStatePanel({ run }: { run: WorkflowRunResult }) {
  const generatedMessages = run.messages.filter((message) => message.role === 'assistant');
  return (
    <div>
      <section className="border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">目标</h2>
          <SessionStatus status={run.session.status} />
        </div>
        <p className="mt-3 text-sm leading-6 font-medium text-slate-800">{run.session.userGoal}</p>
      </section>
      {generatedMessages.length > 0 && (
        <nav aria-label="生成结果导航" className="border-b border-slate-200 py-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">生成结果</h2>
            <span className="text-xs text-slate-400">{generatedMessages.length} 条</span>
          </div>
          <ol className="space-y-1">
            {generatedMessages.map((message, index) => (
              <li key={message.id}>
                <a
                  className="block border-l-2 border-transparent py-1.5 pl-3 text-xs leading-5 text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-700"
                  href={`#workflow-message-${message.id}`}
                >
                  {index + 1}. {getGeneratedMessageTitle(message.content, index)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <section className="border-b border-slate-200 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">计划</h2>
          <span className="text-xs text-slate-400">{run.steps.length} 个步骤</span>
        </div>
        {run.steps.length === 0 ? (
          <p className="py-3 text-xs leading-5 text-slate-400">
            Agent 正在收集足够信息，计划会在这里出现。
          </p>
        ) : (
          <div className="space-y-1">
            {run.steps.map((step, index) => (
              <StepRow
                current={run.session.currentStepId === step.id}
                index={index}
                key={step.id}
                step={step}
              />
            ))}
          </div>
        )}
      </section>
      {run.session.finalOutput && (
        <section className="border-b border-slate-200 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">最终结果</h2>
            <CopyResultButton content={run.session.finalOutput} variant="final" />
          </div>
          <div className="max-h-80 overflow-y-auto border-l-2 border-emerald-300 pl-3">
            <MarkdownRenderer content={run.session.finalOutput} />
          </div>
        </section>
      )}
      <AgentTrace actions={run.actions} />
    </div>
  );
}

function StepRow({
  step,
  index,
  current,
}: {
  step: WorkflowStep;
  index: number;
  current: boolean;
}) {
  const icon =
    step.status === 'done' ? (
      <Check size={12} />
    ) : step.status === 'running' || current ? (
      <LoaderCircle className={step.status === 'running' ? 'animate-spin' : ''} size={12} />
    ) : (
      <Circle size={10} />
    );
  return (
    <div
      className={`flex gap-3 border-l-2 py-2 pl-3 ${current ? 'border-blue-500' : 'border-transparent'}`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          step.status === 'done'
            ? 'bg-emerald-100 text-emerald-700'
            : current
              ? 'bg-blue-700 text-white'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${current ? 'text-blue-900' : 'text-slate-700'}`}>
          {index + 1}. {step.title}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{step.description}</p>
      </div>
    </div>
  );
}

export function AgentTrace({ actions }: { actions: AgentAction[] }) {
  return (
    <details className="group py-5" open>
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">行动记录</span>
        <ChevronDown className="text-slate-400 transition group-open:rotate-180" size={14} />
      </summary>
      <div className="mt-4 space-y-4">
        {actions.length === 0 ? (
          <p className="text-xs text-slate-400">暂无行动记录</p>
        ) : (
          actions
            .slice()
            .reverse()
            .map((action) => (
              <div className="relative border-l border-slate-200 pl-4" key={action.id}>
                <span
                  className={`absolute -left-1 top-1 h-2 w-2 rounded-full ${
                    action.status === 'failed'
                      ? 'bg-red-500'
                      : action.status === 'running'
                        ? 'animate-pulse bg-amber-500'
                        : 'bg-slate-400'
                  }`}
                />
                <p className="text-xs font-semibold text-slate-700">
                  {actionLabels[action.type] ?? action.type}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  {action.reasoningSummary}
                </p>
              </div>
            ))
        )}
      </div>
    </details>
  );
}

function SessionStatus({ status }: { status: WorkflowSessionStatus }) {
  const tone =
    status === 'completed'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'waiting_user'
        ? 'bg-amber-50 text-amber-700'
        : status === 'failed'
          ? 'bg-red-50 text-red-700'
          : 'bg-blue-50 text-blue-700';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}

async function copyToClipboard(content: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const succeeded = document.execCommand('copy');
  textarea.remove();
  if (!succeeded) throw new Error('浏览器拒绝了复制操作。');
}

export function CopyResultButton({
  content,
  variant = 'message',
}: {
  content: string;
  variant?: 'message' | 'final';
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await copyToClipboard(content);
      setState('copied');
    } catch {
      setState('failed');
    }
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setState('idle'), 1800);
  };

  const label = state === 'copied' ? '已复制' : state === 'failed' ? '复制失败' : '复制';
  const isMessageAction = variant === 'message';
  return (
    <button
      aria-label={label}
      className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md text-[11px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:outline-none ${
        isMessageAction
          ? `min-w-7 px-1.5 ${state === 'idle' ? 'opacity-40 group-hover:opacity-100' : 'px-2 opacity-100'}`
          : 'border border-emerald-200/80 bg-white/80 px-2.5 shadow-sm'
      } ${
        state === 'copied'
          ? 'bg-emerald-50 text-emerald-700'
          : state === 'failed'
            ? 'bg-red-50 text-red-600'
            : isMessageAction
              ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              : 'text-emerald-700 hover:border-emerald-300 hover:bg-white'
      }`}
      onClick={() => void copy()}
      title={variant === 'final' ? `${label}最终结果` : `${label}这条回复`}
      type="button"
    >
      {state === 'copied' ? <Check size={11} /> : <Copy size={11} />}
      {(!isMessageAction || state !== 'idle') && label}
    </button>
  );
}
