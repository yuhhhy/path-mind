import { Link, createFileRoute } from '@tanstack/react-router';
import { Clock3, Plus } from 'lucide-react';
import { useGoalStore } from '../features/goal/goalStore';

export const Route = createFileRoute('/goals/')({
  component: GoalsPage,
});

const typeLabel: Record<string, string> = {
  understand_concept: '理解概念',
  prepare_interview: '面试准备',
  build_project: '构建项目',
  pass_exam: '通过考试',
};

function GoalsPage() {
  const goals = useGoalStore((state) => state.goals);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">学习目标</h1>
        <p className="mt-1 text-sm text-gray-500">管理你的所有学习目标和进度。</p>
      </div>

      <div className="grid gap-3">
        {goals.map((goal) => {
          const completedSteps = goal.steps.filter((s) => s.status === 'done').length;
          const totalSteps = goal.steps.length;
          return (
            <Link
              className="block rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 cursor-pointer"
              key={goal.id}
              to="/goals/$goalId"
              params={{ goalId: goal.id }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-900">{goal.title}</h2>
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {typeLabel[goal.type] ?? goal.type}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-500 line-clamp-2">
                    {goal.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={13} />
                    {goal.estimatedMinutes} 分钟
                  </span>
                  <span>
                    {completedSteps}/{totalSteps} 步完成
                  </span>
                  <span>{goal.progress}%</span>
                </div>

                <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}

        {/* New goal card */}
        <button
          className="flex h-24 w-full cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:border-gray-300 hover:bg-gray-50"
          type="button"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-700 text-gray-700">
            <Plus size={18} strokeWidth={2.5} />
          </div>
        </button>
      </div>
    </div>
  );
}
