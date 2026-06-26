import type { ServerResponse } from 'node:http';
import type { SseEvent } from './sse.types.js';

export function formatSseEvent(event: SseEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function writeSse(res: ServerResponse, event: SseEvent) {
  res.write(formatSseEvent(event));
  (res as ServerResponse & { flush?: () => void }).flush?.();
}
