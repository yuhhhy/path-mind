import { describe, expect, it } from 'vite-plus/test';
import { completeStepProgress } from './goal-progress.js';

describe('completeStepProgress', () => {
  it('updates progress and promotes the next todo step', () => {
    const result = completeStepProgress(
      [
        { id: 'a', status: 'learning' },
        { id: 'b', status: 'todo' },
        { id: 'c', status: 'todo' },
      ],
      'a',
    );

    expect(result.progress).toBe(33);
    expect(result.goalStatus).toBe('active');
    expect(result.steps.map((step) => step.status)).toEqual(['done', 'learning', 'todo']);
  });

  it('marks the goal completed when all steps are done', () => {
    const result = completeStepProgress(
      [
        { id: 'a', status: 'done' },
        { id: 'b', status: 'learning' },
      ],
      'b',
    );

    expect(result.progress).toBe(100);
    expect(result.goalStatus).toBe('completed');
  });
});
