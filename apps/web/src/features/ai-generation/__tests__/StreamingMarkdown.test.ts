import { describe, expect, it } from 'vite-plus/test';
import { extractStreamingJsonString } from '../StreamingMarkdown';

describe('extractStreamingJsonString', () => {
  it('decodes a partial JSON string while it is still streaming', () => {
    expect(
      extractStreamingJsonString(
        '{"score":80,"feedback":"第一行\\n**重点**和\\u4e2d\\u6587',
        'feedback',
      ),
    ).toBe('第一行\n**重点**和中文');
  });

  it('returns the same semantic text before and after the JSON is complete', () => {
    const raw = '{"prompt":"## 场景\\n请分析 `Agent` 的行为"}';
    const parsed = JSON.parse(raw) as { prompt: string };

    expect(extractStreamingJsonString(raw, 'prompt')).toBe(parsed.prompt);
  });

  it('waits until the requested field starts', () => {
    expect(extractStreamingJsonString('{"score":90,"feed', 'feedback')).toBe('');
  });
});
