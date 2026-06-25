import { describe, expect, it } from 'vite-plus/test';
import { parseSseEvent } from '../sse';

describe('parseSseEvent', () => {
  it('parses delta events', () => {
    expect(parseSseEvent('data: {"type":"delta","content":"hello"}')).toEqual({
      type: 'delta',
      content: 'hello',
    });
  });

  it('parses done events', () => {
    expect(parseSseEvent('data: {"type":"done"}')).toEqual({ type: 'done' });
  });

  it('parses error events', () => {
    expect(parseSseEvent('data: {"type":"error","message":"bad"}')).toEqual({
      type: 'error',
      message: 'bad',
    });
  });
});
