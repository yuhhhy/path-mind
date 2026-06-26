import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ListChecks,
  Loader2,
  X,
} from 'lucide-react';
import {
  type AIGenerationTask,
  type AIGenerationTaskStatus,
  useAIGenerationStore,
} from './aiGenerationStore';

const statusConfig: Record<
  AIGenerationTaskStatus,
  {
    label: string;
    icon: typeof Loader2;
    dotClassName: string;
    itemClassName: string;
  }
> = {
  running: {
    label: '执行中',
    icon: Loader2,
    dotClassName: 'bg-blue-500',
    itemClassName: 'border-blue-100 bg-blue-50/70',
  },
  queued: {
    label: '待执行',
    icon: Clock3,
    dotClassName: 'bg-amber-400',
    itemClassName: 'border-amber-100 bg-amber-50/60',
  },
  done: {
    label: '已完成',
    icon: CheckCircle2,
    dotClassName: 'bg-emerald-500',
    itemClassName: 'border-emerald-100 bg-emerald-50/60',
  },
  failed: {
    label: '失败',
    icon: AlertCircle,
    dotClassName: 'bg-red-500',
    itemClassName: 'border-red-100 bg-red-50/70',
  },
};

const groupOrder: AIGenerationTaskStatus[] = ['running', 'queued', 'failed', 'done'];

function sortTasks(tasks: AIGenerationTask[]) {
  return [...tasks].sort((a, b) => {
    const statusDiff = groupOrder.indexOf(a.status) - groupOrder.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return b.updatedAt - a.updatedAt;
  });
}

export function AiGenerationDock() {
  const tasks = useAIGenerationStore((state) => state.tasks);
  const isPanelOpen = useAIGenerationStore((state) => state.isPanelOpen);
  const setPanelOpen = useAIGenerationStore((state) => state.setPanelOpen);
  const clearSettledTasks = useAIGenerationStore((state) => state.clearSettledTasks);

  const activeCount = tasks.filter((task) => task.status === 'running').length;
  const queuedCount = tasks.filter((task) => task.status === 'queued').length;
  const failedCount = tasks.filter((task) => task.status === 'failed').length;
  const visibleTasks = sortTasks(tasks).slice(0, 18);
  const currentTask = visibleTasks.find((task) => task.status === 'running');
  const hasTasks = tasks.length > 0;
  const badgeCount = activeCount + queuedCount + failedCount;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isPanelOpen && (
        <section className="w-[min(calc(100vw-2.5rem),380px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl shadow-gray-300/40">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Brain size={15} className="text-blue-600" />
                  <h2 className="text-sm font-semibold text-gray-900">AI 生成任务</h2>
                </div>
                {(currentTask || !hasTasks) && (
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {currentTask ? currentTask.title : '还没有生成任务'}
                  </p>
                )}
              </div>
              <button
                aria-label="关闭 AI 生成任务面板"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setPanelOpen(false)}
                type="button"
              >
                <X size={14} />
              </button>
            </div>

            {hasTasks && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <SummaryPill label="执行中" value={activeCount} />
                <SummaryPill label="待执行" value={queuedCount} />
                <SummaryPill
                  label="失败"
                  value={failedCount}
                  tone={failedCount ? 'danger' : 'muted'}
                />
              </div>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!hasTasks ? (
              <div className="py-10 text-center">
                <ListChecks size={28} className="mx-auto text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">任务队列为空</p>
                <p className="mt-1 text-xs text-gray-400">开始生成学习路径后，这里会实时更新。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupOrder.map((status) => {
                  const group = visibleTasks.filter((task) => task.status === status);
                  if (group.length === 0) return null;
                  return (
                    <div key={status}>
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusConfig[status].dotClassName}`}
                        />
                        <p className="text-xs font-medium text-gray-500">
                          {statusConfig[status].label}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {group.map((task) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {hasTasks && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
              <span className="text-xs text-gray-400">保留最近 18 条生成记录</span>
              <button
                className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-800"
                onClick={clearSettledTasks}
                type="button"
              >
                清理完成项
              </button>
            </div>
          )}
        </section>
      )}

      <button
        aria-expanded={isPanelOpen}
        aria-label="打开 AI 生成任务队列"
        className={
          'group relative flex h-13 min-w-13 items-center justify-center gap-2 rounded-full border px-3.5 shadow-lg transition-all ' +
          (activeCount > 0
            ? 'border-blue-200 bg-blue-600 text-white shadow-blue-200/70 hover:bg-blue-700'
            : failedCount > 0
              ? 'border-red-200 bg-red-600 text-white shadow-red-200/70 hover:bg-red-700'
              : 'border-gray-200 bg-white text-gray-700 shadow-gray-200/80 hover:bg-gray-50')
        }
        onClick={() => setPanelOpen(!isPanelOpen)}
        type="button"
      >
        {activeCount > 0 ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
        {badgeCount > 0 && <span className="text-sm font-semibold">{badgeCount}</span>}
        {badgeCount === 0 && isPanelOpen && <ChevronDown size={15} />}
        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">
            {badgeCount}
          </span>
        )}
      </button>
    </div>
  );
}

function SummaryPill({
  label,
  tone = 'muted',
  value,
}: {
  label: string;
  tone?: 'danger' | 'muted';
  value: number;
}) {
  return (
    <div
      className={
        'rounded-md px-2 py-1.5 ' +
        (tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600')
      }
    >
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[11px]">{label}</p>
    </div>
  );
}

function TaskRow({ task }: { task: AIGenerationTask }) {
  const config = statusConfig[task.status];
  const Icon = config.icon;
  return (
    <article className={`rounded-lg border px-3 py-2.5 ${config.itemClassName}`}>
      <div className="flex gap-2.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80 text-gray-600">
          <Icon size={14} className={task.status === 'running' ? 'animate-spin' : ''} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
          {task.error && <p className="mt-1 text-xs text-red-600">{task.error}</p>}
        </div>
      </div>
    </article>
  );
}
