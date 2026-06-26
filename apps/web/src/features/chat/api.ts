import type {
  ChatMessage,
  ChatSessionInput,
  TeachingGenerationStatus,
  TeachingGenerationStatusItem,
} from '@pathmind/shared';
import { API_BASE_URL } from '../../shared/config';
import { streamSseEvents } from '../../shared/sse-stream';
import { parseSseEvent } from './sse';

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }
  return response.json() as Promise<T>;
}

interface StreamChatCallbacks {
  onDelta(content: string): void;
  onDone(): void;
  onError(error: Error): void;
}

export interface StreamChatSessionInput extends ChatSessionInput {
  userMessage?: string;
  silentUserMessage?: string;
  continueAssistantMessageId?: string;
}

export type { TeachingGenerationStatus, TeachingGenerationStatusItem };

export async function getChatSession(
  goalId: string,
  stepId: string,
): Promise<{ messages: ChatMessage[] }> {
  const response = await fetch(`${API_BASE_URL}/chat/session?goalId=${goalId}&stepId=${stepId}`);
  return parseJsonResponse(response, 'AI 服务暂时不可用，请检查后端服务或数据库。');
}

export async function getTeachingGenerationStatuses(
  goalId: string,
): Promise<{ steps: TeachingGenerationStatusItem[] }> {
  const response = await fetch(`${API_BASE_URL}/chat/teaching-status?goalId=${goalId}`);
  return parseJsonResponse(response, 'AI 教学讲解状态暂时不可用。');
}

export function streamChatSession(
  input: StreamChatSessionInput,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): () => void {
  return streamSseEvents(
    { url: `${API_BASE_URL}/chat/session`, method: 'POST', body: input, signal },
    (rawEvent) => {
      const event = parseSseEvent(rawEvent);
      if (!event) return;
      if (event.type === 'delta') {
        callbacks.onDelta(event.content);
      } else if (event.type === 'done') {
        callbacks.onDone();
      } else {
        callbacks.onError(new Error(event.message));
      }
    },
    (error) => callbacks.onError(error),
  );
}
