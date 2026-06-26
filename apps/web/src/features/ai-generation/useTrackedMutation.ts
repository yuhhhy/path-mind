import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { getErrorMessage } from '../../shared/utils';
import { runQueuedAIGenerationTask } from './aiGenerationQueue';
import { useAIGenerationStore } from './aiGenerationStore';

interface UseTrackedMutationOptions<T> {
  taskId: string;
  title: string;
  scope: { goalId: string; stepId: string };
  stepTitle: string | undefined;
  verificationQueryKey: QueryKey;
  run: () => Promise<T>;
  successDescription: string | ((data: T) => string);
  onSuccess?: (data: T) => void;
}

export function useTrackedMutation<T>({
  taskId,
  title,
  scope,
  stepTitle,
  verificationQueryKey,
  run,
  successDescription,
  onSuccess: customOnSuccess,
}: UseTrackedMutationOptions<T>) {
  const queryClient = useQueryClient();
  const upsertTask = useAIGenerationStore((state) => state.upsertTask);
  const setTaskStatus = useAIGenerationStore((state) => state.setTaskStatus);
  const setPanelOpen = useAIGenerationStore((state) => state.setPanelOpen);

  return useMutation<T>({
    mutationFn: () => runQueuedAIGenerationTask(taskId, run),
    onMutate() {
      upsertTask({
        id: taskId,
        title,
        description: stepTitle ?? '当前学习 Step',
        status: 'queued',
        scope,
      });
      setPanelOpen(true);
    },
    onSuccess(data) {
      const description =
        typeof successDescription === 'function' ? successDescription(data) : successDescription;
      setTaskStatus(taskId, 'done', { description });
      customOnSuccess?.(data);
      void queryClient.invalidateQueries({ queryKey: verificationQueryKey });
    },
    onError(error) {
      setTaskStatus(taskId, 'failed', { error: getErrorMessage(error) });
    },
  });
}
