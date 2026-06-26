import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAIGenerationStore } from '../features/ai-generation/aiGenerationStore';
import { getTeachingGenerationStatuses } from '../features/chat/api';
import { deleteGoal, streamGoalSteps } from '../features/goal/api';
import { LearningPath } from '../features/goal/LearningPath';
import { mockGoals } from '../features/goal/mockGoals';
import { goalQueryOptions, goalsQueryOptions } from '../features/goal/queries';
import type { Goal, LearningStep } from '../features/goal/types';
import { useBreadcrumb } from '../shared/layout/BreadcrumbContext';
import { LinkButton } from '../shared/ui/Button';

export const Route = createFileRoute('/goals/$goalId')({
  component: GoalDetailPage,
});

function StepSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-100 bg-white p-4">
      <div className="flex gap-3">
        <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-gray-100" />
          <div className="h-4 w-3/4 rounded bg-gray-100" />
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

function mergeSteps(current: LearningStep[], incoming: LearningStep[]) {
  const byId = new Map<string, LearningStep>();
  for (const step of current) byId.set(step.id, step);
  for (const step of incoming) byId.set(step.id, step);
  return [...byId.values()];
}

function GoalDetailPage() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSessionRoute = useRouterState({
    select: (state) => state.location.pathname.includes(`/goals/${goalId}/session/`),
  });
  const fallbackGoal = mockGoals.find((item) => item.id === goalId);
  const goalOptions = useMemo(() => goalQueryOptions(goalId), [goalId]);
  const goalsOptions = useMemo(() => goalsQueryOptions(), []);
  const goalQuery = useQuery(goalOptions);
  const goal = goalQuery.data ?? (goalQuery.isError ? fallbackGoal : undefined);
  const goalStatus = goal?.status;
  const goalTitle = goal?.title ?? '';

  const [streamedSteps, setStreamedSteps] = useState<LearningStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGoalMenuOpen, setIsGoalMenuOpen] = useState(false);
  const streamStarted = useRef(false);
  const streamedStepOrderRef = useRef(new Map<string, number>());
  const upsertTask = useAIGenerationStore((state) => state.upsertTask);
  const setTaskStatus = useAIGenerationStore((state) => state.setTaskStatus);
  const displayedSteps = useMemo(
    () => (goal ? mergeSteps(goal.steps, streamedSteps) : streamedSteps),
    [goal, streamedSteps],
  );
  const displayedStepIdsKey = displayedSteps.map((step) => step.id).join('|');

  useBreadcrumb([{ label: '学习目标', href: '/goals' }, { label: goal?.title ?? '' }]);

  useEffect(() => {
    if (goalStatus !== 'initializing') {
      return;
    }
    if (streamStarted.current) {
      return;
    }
    streamStarted.current = true;

    let cleanup: (() => void) | undefined;
    const startTimer = window.setTimeout(() => {
      const currentGoal = queryClient.getQueryData<Goal>(goalOptions.queryKey);
      streamedStepOrderRef.current = new Map(
        (currentGoal?.steps ?? []).map((step, index) => [step.id, index + 1]),
      );
      setIsStreaming(true);
      setTaskStatus('goal:path:queued', 'running', {
        description: `正在生成「${goalTitle}」的学习路径`,
      });
      upsertTask({
        id: `goal:${goalId}:outline`,
        title: '规划目标与最终成果',
        description: goalTitle,
        status: 'running',
        scope: { goalId },
      });
      upsertTask({
        id: `goal:${goalId}:steps`,
        title: '拆解学习路径 Step',
        description: '等待 AI 输出第 1 个 Step',
        status: 'queued',
        scope: { goalId },
      });
      cleanup = streamGoalSteps(goalId, {
        onStep(step) {
          setTaskStatus(`goal:${goalId}:outline`, 'done', {
            description: '目标说明与最终成果已生成',
          });
          if (!streamedStepOrderRef.current.has(step.id)) {
            streamedStepOrderRef.current.set(step.id, streamedStepOrderRef.current.size + 1);
          }
          const stepNumber = streamedStepOrderRef.current.get(step.id) ?? 1;
          const generatedCount = streamedStepOrderRef.current.size;

          upsertTask({
            id: `goal:${goalId}:step:${step.id}`,
            title: `Step ${stepNumber}：${step.title}`,
            description: step.description,
            status: 'done',
            scope: { goalId, stepId: step.id },
          });
          upsertTask({
            id: `goal:${goalId}:steps`,
            title: '拆解学习路径 Step',
            description: `已生成 ${generatedCount} 个 Step，正在等待下一个`,
            status: 'running',
            scope: { goalId },
          });
          upsertTask({
            id: `goal:${goalId}:next-step`,
            title: '生成下一个学习 Step',
            description: 'AI 正在继续拆分后续学习内容',
            status: 'queued',
            scope: { goalId },
          });
          upsertTask({
            id: `step:${step.id}:teaching`,
            title: `生成 Step ${stepNumber} 讲解`,
            status: 'queued',
            scope: { goalId, stepId: step.id },
          });
          setStreamedSteps((prev) => mergeSteps(prev, [step]));
          queryClient.setQueryData<Goal>(goalOptions.queryKey, (current) => {
            if (!current) return current;
            return {
              ...current,
              steps: mergeSteps(current.steps, [step]),
            };
          });
        },
        onDone() {
          setIsStreaming(false);
          setTaskStatus('goal:path:queued', 'done', { description: '学习路径已生成完成' });
          setTaskStatus(`goal:${goalId}:outline`, 'done', {
            description: '目标说明与最终成果已生成',
          });
          setTaskStatus(`goal:${goalId}:steps`, 'done', { description: '所有 Step 已保存' });
          setTaskStatus(`goal:${goalId}:next-step`, 'done', { title: '学习路径生成完成' });
          queryClient.setQueryData<Goal>(goalOptions.queryKey, (current) =>
            current ? { ...current, status: 'active' } : current,
          );
          void queryClient.invalidateQueries({ queryKey: goalOptions.queryKey });
        },
        onError(error) {
          setIsStreaming(false);
          setStreamError(error.message);
          setTaskStatus('goal:path:queued', 'failed', { error: error.message });
          setTaskStatus(`goal:${goalId}:outline`, 'failed', { error: error.message });
          setTaskStatus(`goal:${goalId}:steps`, 'failed', { error: error.message });
          setTaskStatus(`goal:${goalId}:next-step`, 'failed', { error: error.message });
        },
      });
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      streamStarted.current = false;
      streamedStepOrderRef.current = new Map();
      setIsStreaming(false);
      cleanup?.();
    };
  }, [goalStatus, goalTitle, goalId, goalOptions.queryKey, queryClient, setTaskStatus, upsertTask]);

  useEffect(() => {
    if (displayedSteps.length === 0) {
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;

    const syncTeachingStatuses = async () => {
      try {
        const result = await getTeachingGenerationStatuses(goalId);
        if (cancelled) return;

        const statusByStepId = new Map(result.steps.map((step) => [step.stepId, step.status]));
        let hasActiveTeachingTask = false;
        const currentTasks = useAIGenerationStore.getState().tasks;

        displayedSteps.forEach((step, index) => {
          const status = statusByStepId.get(step.id) ?? 'queued';
          if (status !== 'done') {
            hasActiveTeachingTask = true;
          }

          const taskId = `step:${step.id}:teaching`;
          if (currentTasks.find((t) => t.id === taskId)?.status === status) return;

          upsertTask({
            id: taskId,
            title: `生成 Step ${index + 1} 讲解`,
            status,
            scope: { goalId, stepId: step.id },
          });
        });

        if (!hasActiveTeachingTask && intervalId !== undefined) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      } catch {
        // Teaching status is best-effort UI telemetry; keep the path stream unaffected.
      }
    };

    void syncTeachingStatuses();
    intervalId = window.setInterval(syncTeachingStatuses, 2000);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [displayedStepIdsKey, displayedSteps, goalId, upsertTask]);

  if (isSessionRoute) {
    return <Outlet />;
  }

  if (!goal) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">没有找到这个 Goal。</p>
        <Link
          className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          to="/"
        >
          返回工作台
        </Link>
      </div>
    );
  }

  const isInitializing = goal.status === 'initializing';
  const displayedGoal: Goal = { ...goal, steps: displayedSteps };
  const isPathGenerating = isInitializing || isStreaming;

  const completedSteps = displayedGoal.steps.filter((s) => s.status === 'done').length;
  const strategyLabel: Record<string, string> = {
    first_principles: '第一性原理',
    step_by_step: '逐步教学',
    analogy: '类比法',
    case_based: '案例驱动',
    source_code_oriented: '源码导向',
  };
  const assessmentLabel: Record<string, string> = {
    quiz: '测验',
    teach_back: '复述验证',
    practice_task: '实践任务',
    interview_question: '面试题验证',
  };

  const handleDeleteGoal = async () => {
    if (!window.confirm(`确定删除学习目标「${goal.title}」吗？这个操作不可恢复。`)) return;

    setIsGoalMenuOpen(false);
    setIsDeleting(true);
    try {
      await deleteGoal(goalId);
      queryClient.removeQueries({ queryKey: goalOptions.queryKey });
      void queryClient.invalidateQueries({ queryKey: goalsOptions.queryKey });
      void navigate({ to: '/goals' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative rounded-lg border border-gray-200 bg-white p-6 pb-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">目标详情</p>
              {isInitializing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  AI 规划中
                </span>
              )}
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gray-900">{goal.title}</h1>
            {goal.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{goal.description}</p>
            )}

            {!isInitializing && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-500">
                  <span>
                    {goal.status === 'active'
                      ? '进行中'
                      : goal.status === 'completed'
                        ? '已完成'
                        : '暂停'}
                  </span>
                  <span>进度 {goal.progress}%</span>
                  <span>
                    {completedSteps}/{displayedGoal.steps.length} 步完成
                  </span>
                  <span>预计 {goal.estimatedMinutes} 分钟</span>
                </div>

                <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>
                    教学策略：
                    {strategyLabel[goal.learningConfig.teachingStrategy] ??
                      goal.learningConfig.teachingStrategy}
                  </span>
                  <span>
                    验证方式：
                    {goal.learningConfig.assessmentMethods
                      .map((m) => assessmentLabel[m] ?? m)
                      .join('、')}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="shrink-0">
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {goal.type === 'understand_concept'
                ? '理解概念'
                : goal.type === 'prepare_interview'
                  ? '面试准备'
                  : goal.type === 'build_project'
                    ? '构建项目'
                    : goal.type}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 right-4">
          <button
            aria-expanded={isGoalMenuOpen}
            aria-haspopup="menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
            onClick={() => setIsGoalMenuOpen((current) => !current)}
            type="button"
          >
            <MoreHorizontal size={18} />
          </button>

          {isGoalMenuOpen && (
            <div
              className="absolute bottom-9 right-0 z-10 w-28 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg shadow-gray-200/70"
              role="menu"
            >
              <button
                className="flex h-9 w-full items-center gap-1.5 bg-red-50 px-2.5 text-left font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDeleting}
                onClick={handleDeleteGoal}
                role="menuitem"
                type="button"
              >
                <Trash2 size={12} />
                <span className="text-xs">{isDeleting ? '正在删除' : '删除目标'}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">学习路径</p>
        <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
          {isPathGenerating ? (
            <div className="space-y-2">
              {displayedSteps.map((step, index) => (
                <article className="rounded-lg border border-gray-200 bg-white p-4" key={step.id}>
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200">
                      <span className="text-[10px] font-medium text-gray-400">{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-400">Step {index + 1}</p>
                          <h3 className="mt-0.5 text-sm font-semibold text-gray-900">
                            {step.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">
                            {step.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <span className="inline-flex h-6 items-center rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-700">
                            已生成
                          </span>
                          <span className="text-xs text-gray-400">
                            {step.estimatedMinutes} 分钟
                          </span>
                          <LinkButton
                            className="justify-center px-3"
                            tone="secondary"
                            to="/goals/$goalId/session/$stepId"
                            params={{ goalId, stepId: step.id }}
                          >
                            开始
                          </LinkButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {isStreaming && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    正在生成下一个 Step
                  </div>
                  <StepSkeleton />
                </div>
              )}
              {streamError && (
                <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {streamError}
                </p>
              )}
            </div>
          ) : (
            <LearningPath goal={displayedGoal} />
          )}

          <aside className="rounded-lg border border-gray-200 bg-white p-5 lg:sticky lg:top-6">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">最终成果</p>
            {isPathGenerating && displayedGoal.finalOutcome.length === 0 ? (
              <div className="mt-3 space-y-2">
                {[80, 60, 70].map((w) => (
                  <div className="animate-pulse" key={w} style={{ width: `${w}%` }}>
                    <div className="h-3 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {goal.finalOutcome.map((outcome) => (
                  <li className="flex gap-2 text-sm leading-relaxed text-gray-600" key={outcome}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
