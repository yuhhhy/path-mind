import { describe, expect, it } from 'vite-plus/test';
import { appendMessageDelta } from './message-buffer.js';

describe('appendMessageDelta', () => {
  it('accumulates streamed message chunks in order', () => {
    const first = appendMessageDelta('', 'hello');
    const second = appendMessageDelta(first, ' world');

    expect(second).toBe('hello world');
  });
});
