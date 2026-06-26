import type {
  ChatMessage,
  ChatSessionInput,
  TeachingGenerationStatus,
  TeachingGenerationStatusItem,
} from '@pathmind/shared';
import { API_BASE_URL } from '../../shared/config';
import { parseSseEvent } from './sse';

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

  if (!response.ok) {
    throw new Error('AI 服务暂时不可用，请检查后端服务或数据库。');
  }

  return response.json() as Promise<{ messages: ChatMessage[] }>;
}

export async function getTeachingGenerationStatuses(
  goalId: string,
): Promise<{ steps: TeachingGenerationStatusItem[] }> {
  const response = await fetch(`${API_BASE_URL}/chat/teaching-status?goalId=${goalId}`);

  if (!response.ok) {
    throw new Error('AI 教学讲解状态暂时不可用。');
  }

  return response.json() as Promise<{ steps: TeachingGenerationStatusItem[] }>;
}

export async function streamChatSession(
  input: StreamChatSessionInput,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error('AI 服务暂时不可用，请检查后端服务或 API Key。');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\n\n/);
      buffer = events.pop() ?? '';

      for (const eventText of events) {
        const event = parseSseEvent(eventText);
        if (!event) {
          continue;
        }

        if (event.type === 'delta') {
          callbacks.onDelta(event.content);
        } else if (event.type === 'done') {
          callbacks.onDone();
          return;
        } else {
          callbacks.onError(new Error(event.message));
          return;
        }
      }
    }

    callbacks.onDone();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }
    callbacks.onError(
      error instanceof Error ? error : new Error('AI 服务暂时不可用，请检查后端服务或 API Key。'),
    );
  }
}
