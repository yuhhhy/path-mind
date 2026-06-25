import { create } from 'zustand';
import { mockGoals } from './mockGoals';
import type { GenerateLearningPathInput, GenerateLearningPathOutput, Goal } from './types';

interface GoalStore {
  goals: Goal[];
  getGoalById: (goalId: string) => Goal | undefined;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  createGoalFromGeneratedPath: (
    input: GenerateLearningPathInput,
    output: GenerateLearningPathOutput,
  ) => Goal;
  completeStep: (goalId: string, stepId: string) => void;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'goal'
  );
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: mockGoals,
  getGoalById: (goalId) => get().goals.find((goal) => goal.id === goalId),
  addGoal: (goal) => {
    set((state) => ({ goals: [goal, ...state.goals] }));
  },
  updateGoal: (goal) => {
    set((state) => ({
      goals: state.goals.map((item) => (item.id === goal.id ? goal : item)),
    }));
  },
  createGoalFromGeneratedPath: (input, output) => {
    const goal: Goal = {
      id: `${slugify(output.title || input.goalTitle)}-${Date.now()}`,
      title: output.title,
      description: output.description,
      type: input.goalType,
      status: 'active',
      progress: 0,
      estimatedMinutes: output.estimatedMinutes,
      learningConfig: input.learningConfig,
      finalOutcome: output.finalOutcome,
      steps: output.steps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'learning' : 'todo',
      })),
    };

    get().addGoal(goal);
    return goal;
  },
  completeStep: (goalId, stepId) => {
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) {
          return goal;
        }

        const completedCandidate = goal.steps.map((step) =>
          step.id === stepId ? { ...step, status: 'done' as const } : step,
        );
        const nextTodoIndex = completedCandidate.findIndex((step) => step.status === 'todo');
        const steps = completedCandidate.map((step, index) =>
          index === nextTodoIndex ? { ...step, status: 'learning' as const } : step,
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
