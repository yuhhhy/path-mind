export type ParsedSseEvent =
  | { type: 'delta'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function extractSseData(rawEvent: string): string | null {
  const data = rawEvent
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  return data || null;
}

export function parseSseEvent(rawEvent: string): ParsedSseEvent | null {
  const data = extractSseData(rawEvent);
  if (!data) return null;

  const parsed = JSON.parse(data) as ParsedSseEvent;
  if (parsed.type === 'delta' || parsed.type === 'done' || parsed.type === 'error') {
    return parsed;
  }

  return null;
}
