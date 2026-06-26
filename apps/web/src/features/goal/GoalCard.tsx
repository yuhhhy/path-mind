import { Clock3 } from 'lucide-react';
import { LinkButton } from '../../shared/ui/Button';
import type { Goal } from './types';

interface GoalCardProps {
  goal: Goal;
}

const typeLabel: Record<string, string> = {
  understand_concept: '理解概念',
  prepare_interview: '面试准备',
  build_project: '构建项目',
  pass_exam: '通过考试',
};

export function GoalCard({ goal }: GoalCardProps) {
  const completedSteps = goal.steps.filter((s) => s.status === 'done').length;
  const totalSteps = goal.steps.length;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {typeLabel[goal.type] ?? goal.type}
            </span>
            <h2 className="mt-2 text-sm font-semibold text-gray-900">{goal.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 line-clamp-2">
              {goal.description}
            </p>
          </div>
          <LinkButton
            className="shrink-0 justify-center px-3.5"
            to="/goals/$goalId"
            params={{ goalId: goal.id }}
          >
            查看路径
          </LinkButton>
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
    </article>
  );
}
