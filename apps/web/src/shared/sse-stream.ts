export interface SseStreamOptions {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}

export type SseStreamResult =
  | { ok: true; reader: ReadableStreamDefaultReader<Uint8Array> }
  | { ok: false; error: Error };

async function openSseStream(options: SseStreamOptions): Promise<SseStreamResult> {
  const fetchInit: RequestInit = {
    signal: options.signal,
    ...(options.method === 'POST'
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options.body),
        }
      : {}),
  };

  const response = await fetch(options.url, fetchInit);

  if (!response.ok || !response.body) {
    return { ok: false, error: new Error('AI 服务暂时不可用，请检查后端服务或 API Key。') };
  }

  return { ok: true, reader: response.body.getReader() };
}

/**
 * Reads an SSE stream line-by-line, calling `onEvent` for every complete SSE block
 * (separated by double newlines). Handles AbortError silently.
 *
 * Returns a cleanup function that aborts the stream.
 */
export function streamSseEvents(
  options: SseStreamOptions,
  onEvent: (rawEvent: string) => void,
  onError: (error: Error) => void,
): () => void {
  const controller = new AbortController();
  const mergedSignal = options.signal
    ? combineAbortSignals(options.signal, controller.signal)
    : controller.signal;

  void (async () => {
    try {
      const result = await openSseStream({ ...options, signal: mergedSignal });

      if (!result.ok) {
        onError(result.error);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await result.reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\n\n/);
        buffer = events.pop() ?? '';

        for (const eventText of events) {
          onEvent(eventText);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      onError(error instanceof Error ? error : new Error('AI 服务暂时不可用。'));
    }
  })();

  return () => controller.abort();
}

function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const abort = () => controller.abort();
  a.addEventListener('abort', abort, { once: true });
  b.addEventListener('abort', abort, { once: true });
  return controller.signal;
}
