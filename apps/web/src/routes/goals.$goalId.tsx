import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router';
import { ArrowLeft, Target } from 'lucide-react';
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
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-slate-600">没有找到这个 Goal。</p>
        <Link className="mt-4 inline-flex text-sm font-medium text-sky-700" to="/">
          返回 Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        to="/"
      >
        <ArrowLeft size={16} />
        返回 Dashboard
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
              <Target size={16} />
              {goal.status}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">{goal.title}</h2>
            <p className="mt-3 leading-7 text-slate-600">{goal.description}</p>
          </div>
          <div className="w-full rounded-lg bg-slate-50 p-4 lg:w-72">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Goal Progress</span>
              <span className="text-slate-500">{goal.progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-600"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-500">预计总时长 {goal.estimatedMinutes} 分钟</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h3 className="mb-4 text-xl font-semibold text-slate-950">Learning Path</h3>
          <LearningPath goal={goal} />
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-950">最终成果</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {goal.finalOutcome.map((outcome) => (
              <li className="flex gap-2" key={outcome}>
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
