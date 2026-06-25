import { Link } from '@tanstack/react-router';
import { ArrowRight, Clock3 } from 'lucide-react';
import type { Goal } from './types';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700">{goal.type}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{goal.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{goal.description}</p>
        </div>

        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <span>教学策略：{goal.learningConfig.teachingStrategy}</span>
          <span>输出形式：{goal.learningConfig.preferredOutputFormats.join(', ')}</span>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">当前进度</span>
            <span className="text-slate-500">{goal.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-600"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Clock3 size={16} />
            预计 {goal.estimatedMinutes} 分钟
          </span>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            to="/goals/$goalId"
            params={{ goalId: goal.id }}
          >
            进入 Goal
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
