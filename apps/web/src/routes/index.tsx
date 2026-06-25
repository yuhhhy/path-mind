import { Link, createFileRoute } from '@tanstack/react-router';
import { GoalCard } from '../features/goal/GoalCard';
import { useGoalStore } from '../features/goal/goalStore';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const goals = useGoalStore((state) => state.goals);
  const activeGoal = goals.find((g) => g.status === 'active');
  const completedSteps = activeGoal
    ? activeGoal.steps.filter((s) => s.status === 'done').length
    : 0;
  const totalSteps = activeGoal?.steps.length ?? 0;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">学习工作台</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          围绕目标规划路径、完成学习步骤，并通过复述和练习验证理解。
        </p>
      </section>

      {activeGoal && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">当前目标</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{activeGoal.title}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {activeGoal.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                <span>进度 {activeGoal.progress}%</span>
                <span>
                  已完成 {completedSteps}/{totalSteps} 步
                </span>
                <span>
                  预计剩余{' '}
                  {activeGoal.estimatedMinutes -
                    Math.round((activeGoal.progress / 100) * activeGoal.estimatedMinutes)}{' '}
                  分钟
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all duration-500"
                  style={{ width: `${activeGoal.progress}%` }}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-2">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                to="/goals/$goalId"
                params={{ goalId: activeGoal.id }}
              >
                继续学习
              </Link>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                to="/goals/$goalId"
                params={{ goalId: activeGoal.id }}
              >
                查看路径
              </Link>
            </div>
          </div>
        </section>
      )}

      {goals.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">所有目标</h3>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
              {goals.length} 个
            </span>
          </div>
          <div className="grid gap-4">
            {goals.map((goal) => (
              <GoalCard goal={goal} key={goal.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
