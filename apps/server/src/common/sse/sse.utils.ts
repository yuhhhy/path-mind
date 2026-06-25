import type { SseEvent } from './sse.types.js';

export function formatSseEvent(event: SseEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}
