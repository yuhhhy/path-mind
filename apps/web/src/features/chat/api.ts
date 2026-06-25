import type { ChatSessionInput } from '@pathmind/shared';
import { parseSseEvent } from './sse';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface StreamChatCallbacks {
  onDelta(content: string): void;
  onDone(): void;
  onError(error: Error): void;
}

export async function streamChatSession(
  input: ChatSessionInput,
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
