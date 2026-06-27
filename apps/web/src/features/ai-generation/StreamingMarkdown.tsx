import { LazyMarkdownRenderer } from '../chat/LazyMarkdownRenderer';

const jsonEscapes: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

export function extractStreamingJsonString(source: string, field: string): string {
  const propertyPattern = new RegExp(
    `"${field.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\s*:\\s*"`,
  );
  const match = propertyPattern.exec(source);
  if (!match) return '';

  let decoded = '';
  for (let index = match.index + match[0].length; index < source.length; index++) {
    const character = source[index];
    if (character === '"') break;
    if (character !== '\\') {
      decoded += character;
      continue;
    }

    const escape = source[++index];
    if (!escape) break;
    if (escape === 'u') {
      const codePoint = source.slice(index + 1, index + 5);
      if (!/^[\da-f]{4}$/i.test(codePoint)) break;
      decoded += String.fromCharCode(Number.parseInt(codePoint, 16));
      index += 4;
      continue;
    }

    decoded += jsonEscapes[escape] ?? escape;
  }

  return decoded;
}

export function StreamingMarkdown({
  content,
  jsonField,
  placeholder,
}: {
  content: string | undefined;
  jsonField?: string;
  placeholder: string;
}) {
  const visibleContent = jsonField
    ? extractStreamingJsonString(content ?? '', jsonField)
    : (content ?? '');

  return visibleContent ? (
    <LazyMarkdownRenderer content={visibleContent} />
  ) : (
    <p className="text-sm text-gray-400">{placeholder}</p>
  );
}
