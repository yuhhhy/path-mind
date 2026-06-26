import { useAIGenerationStore } from './aiGenerationStore';

let queueTail: Promise<void> = Promise.resolve();

export async function runQueuedAIGenerationTask<T>(taskId: string, run: () => Promise<T>) {
  const currentTurn = queueTail
    .catch(() => undefined)
    .then(() => {
      useAIGenerationStore.getState().setTaskStatus(taskId, 'running');
      return run();
    });

  queueTail = currentTurn.then(
    () => undefined,
    () => undefined,
  );

  return currentTurn;
}
