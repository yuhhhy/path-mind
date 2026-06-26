import type { LearningStep } from './goal.js';

export type SseEvent =
  | { type: 'delta'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | {
      type: 'step';
      step: Pick<LearningStep, 'id' | 'title' | 'description' | 'status' | 'estimatedMinutes'>;
    };
