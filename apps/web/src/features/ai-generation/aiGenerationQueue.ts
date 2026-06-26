import { useAIGenerationStore } from './aiGenerationStore';

let queueTail: Promise<void> = Promise.resolve();

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForRunningTasksToSettle(taskId: string) {
  while (true) {
    const { tasks } = useAIGenerationStore.getState();
    const hasBlockingTask = tasks.some((task) => task.id !== taskId && task.status === 'running');

    if (!hasBlockingTask) {
      return;
    }

    await delay(250);
  }
}

export async function runQueuedAIGenerationTask<T>(taskId: string, run: () => Promise<T>) {
  const currentTurn = queueTail
    .catch(() => undefined)
    .then(async () => {
      await delay(150);
      await waitForRunningTasksToSettle(taskId);
      useAIGenerationStore.getState().setTaskStatus(taskId, 'running');
      return run();
    });

  queueTail = currentTurn.then(
    () => undefined,
    () => undefined,
  );

  return currentTurn;
}
