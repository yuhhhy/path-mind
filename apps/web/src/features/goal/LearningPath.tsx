import { Link } from '@tanstack/react-router';
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import type { Goal, LearningStep } from './types';

interface LearningPathProps {
  goal: Goal;
}

function getStepIcon(step: LearningStep) {
  if (step.status === 'done') {
    return <CheckCircle2 className="text-emerald-500" size={16} />;
  }
  if (step.status === 'learning') {
    return <PlayCircle className="text-blue-700" size={16} />;
  }
  return <Circle className="text-gray-300" size={16} />;
}

export function LearningPath({ goal }: LearningPathProps) {
  return (
    <div className="space-y-2">
      {goal.steps.map((step, index) => {
        const isDone = step.status === 'done';
        const isLearning = step.status === 'learning';
        const buttonLabel = isDone ? '查看' : isLearning ? '开始学习' : '开始';

        return (
          <article
            className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
            key={step.id}
          >
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200">
                {getStepIcon(step)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-400">Step {index + 1}</p>
                    <h3
                      className={
                        'mt-0.5 text-sm font-semibold ' +
                        (isDone ? 'text-gray-400' : 'text-gray-900')
                      }
                    >
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className="text-xs text-gray-400">{step.estimatedMinutes} 分钟</span>
                    <Link
                      className={
                        isLearning
                          ? 'inline-flex h-7 items-center justify-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700'
                          : 'inline-flex h-7 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50'
                      }
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
