import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useGoalStore } from '../goalStore';
import { mockGoals } from '../mockGoals';

beforeEach(() => {
  useGoalStore.setState({ goals: mockGoals });
});

describe('goalStore', () => {
  it('updates progress when completing a step', () => {
    useGoalStore.getState().completeStep('browser-rendering', 'network-request');

    const goal = useGoalStore.getState().getGoalById('browser-rendering');

    expect(goal?.progress).toBe(40);
  });

  it('marks the goal completed when all steps are done', () => {
    for (const step of mockGoals[0].steps) {
      useGoalStore.getState().completeStep('browser-rendering', step.id);
    }

    const goal = useGoalStore.getState().getGoalById('browser-rendering');

    expect(goal?.progress).toBe(100);
    expect(goal?.status).toBe('completed');
  });

  it('creates a generated goal with the first step learning and remaining steps todo', () => {
    const goal = useGoalStore.getState().createGoalFromGeneratedPath(
      {
        goalTitle: '学会 React Query',
        goalType: 'understand_concept',
        learningConfig: {
          teachingStrategy: 'step_by_step',
          preferredOutputFormats: ['text'],
          assessmentMethods: ['quiz'],
        },
      },
      {
        title: '学会 React Query',
        description: '掌握服务端状态管理',
        estimatedMinutes: 40,
        finalOutcome: ['能解释缓存和失效'],
        steps: [
          {
            id: 'overview',
            title: '理解服务端状态',
            description: '区分本地状态和服务端状态',
            estimatedMinutes: 10,
          },
          {
            id: 'cache',
            title: '理解缓存',
            description: '理解 staleTime 和 gcTime',
            estimatedMinutes: 15,
          },
        ],
      },
    );

    expect(goal.steps[0].status).toBe('learning');
    expect(goal.steps[1].status).toBe('todo');
  });
});
