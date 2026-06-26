import type { ChatMessage, ChatSessionInput } from '@pathmind/shared';
import { parseSseEvent } from './sse';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

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

export type TeachingGenerationStatus = 'queued' | 'running' | 'done';

export interface TeachingGenerationStatusItem {
  stepId: string;
  status: TeachingGenerationStatus;
}

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
