import { createFileRoute } from '@tanstack/react-router';
import { GoalCard } from '../features/goal/GoalCard';
import { useGoalStore } from '../features/goal/goalStore';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const goals = useGoalStore((state) => state.goals);

  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-slate-950 p-6 text-white">
        <p className="text-sm font-medium text-sky-200">Sprint 1 MVP</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
          PathMind 不只是回答问题，而是围绕学习目标规划路径、组织学习过程，并陪伴你完成学习闭环。
        </h2>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">当前 Goal</p>
            <h2 className="text-2xl font-semibold text-slate-950">继续你的学习路径</h2>
          </div>
          <span className="text-sm text-slate-500">{goals.length} 个目标</span>
        </div>
        <div className="grid gap-4">
          {goals.map((goal) => (
            <GoalCard goal={goal} key={goal.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
