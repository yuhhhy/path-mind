import { Link } from '@tanstack/react-router';
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import type { Goal, LearningStep } from './types';

interface LearningPathProps {
  goal: Goal;
}

function getStepIcon(step: LearningStep) {
  if (step.status === 'done') {
    return <CheckCircle2 className="text-emerald-600" size={22} />;
  }

  if (step.status === 'learning') {
    return <PlayCircle className="text-sky-600" size={22} />;
  }

  return <Circle className="text-slate-300" size={22} />;
}

export function LearningPath({ goal }: LearningPathProps) {
  return (
    <div className="space-y-3">
      {goal.steps.map((step, index) => (
        <article
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          key={step.id}
        >
          <div className="flex gap-4">
            <div className="mt-1">{getStepIcon(step)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Step {index + 1} · {step.status}
                  </p>
                  <h3 className="mt-1 font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
                <span className="shrink-0 text-sm text-slate-500">
                  {step.estimatedMinutes} 分钟
                </span>
              </div>
              <Link
                className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                to="/goals/$goalId/session/$stepId"
                params={{ goalId: goal.id, stepId: step.id }}
              >
                进入学习 Session
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
