import { Link } from '@tanstack/react-router';
import { Clock3 } from 'lucide-react';
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
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              {typeLabel[goal.type] ?? goal.type}
            </p>
            <h2 className="mt-2 text-base font-semibold text-slate-900">{goal.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 line-clamp-2">{goal.description}</p>
          </div>
          <Link
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
            to="/goals/$goalId"
            params={{ goalId: goal.id }}
          >
            查看路径
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} />
            {goal.estimatedMinutes} 分钟
          </span>
          <span>
            {completedSteps}/{totalSteps} 步完成
          </span>
          <span>{goal.progress}%</span>
        </div>

        <div className="h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-600 transition-all duration-500"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}
