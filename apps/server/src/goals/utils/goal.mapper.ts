import type { Goal as SharedGoal } from '@pathmind/shared';

export interface GoalRecord {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  progress: number;
  estimatedMinutes: number;
  teachingStrategy: string;
  outputFormats: string[];
  assessmentMethods: string[];
  finalOutcome: string[];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    estimatedMinutes: number;
  }>;
}

export function toSharedGoal(goal: GoalRecord): SharedGoal {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    type: goal.type as SharedGoal['type'],
    status: goal.status as SharedGoal['status'],
    progress: goal.progress,
    estimatedMinutes: goal.estimatedMinutes,
    learningConfig: {
      teachingStrategy: goal.teachingStrategy as SharedGoal['learningConfig']['teachingStrategy'],
      preferredOutputFormats:
        goal.outputFormats as SharedGoal['learningConfig']['preferredOutputFormats'],
      assessmentMethods:
        goal.assessmentMethods as SharedGoal['learningConfig']['assessmentMethods'],
    },
    finalOutcome: goal.finalOutcome,
    steps: goal.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      status: step.status as SharedGoal['steps'][number]['status'],
      estimatedMinutes: step.estimatedMinutes,
    })),
  };
}
