import { Link } from '@tanstack/react-router';
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import type { Goal, LearningStep } from './types';

interface LearningPathProps {
  goal: Goal;
}

function getStepIcon(step: LearningStep) {
  if (step.status === 'done') {
    return <CheckCircle2 className="text-emerald-600" size={18} />;
  }
  if (step.status === 'learning') {
    return <PlayCircle className="text-sky-600" size={18} />;
  }
  return <Circle className="text-slate-300" size={18} />;
}

export function LearningPath({ goal }: LearningPathProps) {
  return (
    <div className="space-y-2">
      {goal.steps.map((step, index) => {
        const titleClass =
          'mt-0.5 text-sm font-semibold ' +
          (step.status === 'done' ? 'text-slate-500' : 'text-slate-900');

        const isDone = step.status === 'done';
        const isLearning = step.status === 'learning';

        const buttonLabel = isDone ? '查看' : isLearning ? '开始学习' : '开始';
        const buttonClass = isLearning
          ? 'inline-flex min-h-8 items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700'
          : 'inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700';

        return (
          <article
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:border-slate-300"
            key={step.id}
          >
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
                {getStepIcon(step)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">Step {index + 1}</p>
                    <h3 className={titleClass}>{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-slate-400">{step.estimatedMinutes} 分钟</span>
                    <Link
                      className={buttonClass}
                      to="/goals/$goalId/session/$stepId"
                      params={{ goalId: goal.id, stepId: step.id }}
                    >
                      {buttonLabel}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
