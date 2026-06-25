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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">没有找到这个 Goal。</p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-sky-700"
          to="/"
        >
          返回 Dashboard
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
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        to="/"
      >
        <ArrowLeft size={16} />
        返回
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">目标详情</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              {goal.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{goal.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span>
                状态：
                {goal.status === 'active'
                  ? '进行中'
                  : goal.status === 'completed'
                    ? '已完成'
                    : '暂停'}
              </span>
              <span>进度：{goal.progress}%</span>
              <span>
                已完成：{completedSteps}/{goal.steps.length} 步
              </span>
              <span>预计总时长：{goal.estimatedMinutes} 分钟</span>
            </div>

            <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-all duration-500"
                style={{ width: `${goal.progress}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
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
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
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

      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <h3 className="mb-4 text-base font-semibold text-slate-900">学习路径</h3>
          <LearningPath goal={goal} />
        </div>
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-28 lg:self-start lg:mt-10">
          <h3 className="text-sm font-semibold text-slate-900">最终成果</h3>
          <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-500">
            {goal.finalOutcome.map((outcome) => (
              <li className="flex gap-2" key={outcome}>
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
