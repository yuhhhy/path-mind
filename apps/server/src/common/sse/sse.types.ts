export type SseEvent =
  | { type: 'delta'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | {
      type: 'step';
      step: {
        id: string;
        title: string;
        description: string;
        status: string;
        estimatedMinutes: number;
      };
    };
