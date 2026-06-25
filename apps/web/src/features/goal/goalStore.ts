import { create } from 'zustand';
import { mockGoals } from './mockGoals';
import type { Goal } from './types';

interface GoalStore {
  goals: Goal[];
  getGoalById: (goalId: string) => Goal | undefined;
  completeStep: (goalId: string, stepId: string) => void;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: mockGoals,
  getGoalById: (goalId) => get().goals.find((goal) => goal.id === goalId),
  completeStep: (goalId, stepId) => {
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) {
          return goal;
        }

        const steps = goal.steps.map((step) =>
          step.id === stepId ? { ...step, status: 'done' as const } : step,
        );
        const completedSteps = steps.filter((step) => step.status === 'done');
        const progress = Math.round((completedSteps.length / steps.length) * 100);

        return {
          ...goal,
          steps,
          progress,
          status: progress === 100 ? 'completed' : goal.status,
        };
      }),
    }));
  },
}));
