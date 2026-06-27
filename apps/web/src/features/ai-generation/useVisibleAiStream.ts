import { useCallback, useEffect, useRef, useState } from 'react';
import type { AIGenerationTask } from './aiGenerationStore';
import { useAIGenerationStore } from './aiGenerationStore';

type StreamCallbacks<TData> = {
  onState(data: TData): void;
  onDelta(content: string): void;
  onDone(data: TData | undefined): void;
  onError(error: Error): void;
};

type StreamStarter<TArgs, TData> = (args: TArgs, callbacks: StreamCallbacks<TData>) => () => void;

interface VisibleAiStreamOptions<TArgs, TData> {
  stream: StreamStarter<TArgs, TData>;
  task: Pick<AIGenerationTask, 'id' | 'title' | 'description' | 'scope'>;
  runningTitle?: string;
  doneTitle?: string;
  doneDescription?: (data: TData | undefined) => string | undefined;
  onState?: (data: TData) => void;
  onDelta?: (content: string) => void;
  onDone?: (data: TData | undefined) => void;
  onError?: (error: Error) => void;
}

export function useVisibleAiStream<TArgs, TData>({
  doneDescription,
  doneTitle,
  onDelta,
  onDone,
  onError,
  onState,
  runningTitle,
  stream,
  task,
}: VisibleAiStreamOptions<TArgs, TData>) {
  const [isActive, setIsActive] = useState(false);
  const [isVisibleStreaming, setIsVisibleStreaming] = useState(false);
  const [error, setError] = useState('');
  const cleanupRef = useRef<(() => void) | null>(null);
  const hasVisibleOutputRef = useRef(false);
  const callbacksRef = useRef({
    doneDescription,
    doneTitle,
    onDelta,
    onDone,
    onError,
    onState,
  });
  const upsertTask = useAIGenerationStore((state) => state.upsertTask);
  const setTaskStatus = useAIGenerationStore((state) => state.setTaskStatus);

  useEffect(() => {
    callbacksRef.current = {
      doneDescription,
      doneTitle,
      onDelta,
      onDone,
      onError,
      onState,
    };
  }, [doneDescription, doneTitle, onDelta, onDone, onError, onState]);

  const stop = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const promoteToRunning = useCallback(() => {
    if (hasVisibleOutputRef.current) return;
    hasVisibleOutputRef.current = true;
    setIsVisibleStreaming(true);
    upsertTask({
      ...task,
      title: runningTitle ?? task.title,
      status: 'running',
    });
  }, [runningTitle, task, upsertTask]);

  const start = useCallback(
    (args: TArgs) => {
      if (cleanupRef.current) return;

      hasVisibleOutputRef.current = false;
      setError('');
      setIsActive(true);
      setIsVisibleStreaming(false);
      upsertTask({ ...task, status: 'queued' });

      cleanupRef.current = stream(args, {
        onState(data) {
          callbacksRef.current.onState?.(data);
          promoteToRunning();
        },
        onDelta(content) {
          callbacksRef.current.onDelta?.(content);
          promoteToRunning();
        },
        onDone(data) {
          setIsActive(false);
          setIsVisibleStreaming(false);
          stop();
          callbacksRef.current.onDone?.(data);
          setTaskStatus(task.id, 'done', {
            title: callbacksRef.current.doneTitle,
            description: callbacksRef.current.doneDescription?.(data),
          });
        },
        onError(streamError) {
          setIsActive(false);
          setIsVisibleStreaming(false);
          stop();
          setError(streamError.message);
          callbacksRef.current.onError?.(streamError);
          setTaskStatus(task.id, 'failed', { error: streamError.message });
        },
      });
    },
    [promoteToRunning, setTaskStatus, stop, stream, task, upsertTask],
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    error,
    isActive,
    isVisibleStreaming,
    start,
    stop,
  };
}
