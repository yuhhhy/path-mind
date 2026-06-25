import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useGoalStore } from '../features/goal/goalStore';
import { LearningPath } from '../features/goal/LearningPath';

export const Route = createFileRoute('/goals/$goalId')({
  component: GoalDetailPage,
});

function GoalDetailPage() {
  const { goalId } = Route.useParams();
  const isSessionRoute = useRouterState({
    select: (state) => state.location.pathname.includes(`/goals/${goalId}/session/`),
  });
  const goal = useGoalStore((state) => state.getGoalById(goalId));

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

  const completedSteps = goal.steps.filter((s) => s.status === 'done').length;
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

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        to="/goals"
      >
        <ArrowLeft size={15} />
        返回
      </Link>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">目标详情</p>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gray-900">{goal.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{goal.description}</p>

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
                {completedSteps}/{goal.steps.length} 步完成
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
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">学习路径</p>
        <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
          <LearningPath goal={goal} />
          <aside className="rounded-lg border border-gray-200 bg-white p-5 lg:sticky lg:top-6">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">最终成果</p>
            <ul className="mt-3 space-y-2.5">
              {goal.finalOutcome.map((outcome) => (
                <li className="flex gap-2 text-sm leading-relaxed text-gray-600" key={outcome}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </div>
  );
}
