import { describe, expect, it } from 'vite-plus/test';
import { SharedStreamRegistry } from './shared-stream-registry.js';

describe('SharedStreamRegistry', () => {
  it('replays existing events and keeps following the same live producer after rejoining', async () => {
    const registry = new SharedStreamRegistry<string>(10);
    const firstController = new AbortController();
    let producerStarts = 0;
    let releaseNextEvent: (() => void) | undefined;
    const waitForNextEvent = new Promise<void>((resolve) => {
      releaseNextEvent = resolve;
    });

    async function* producer() {
      producerStarts++;
      yield 'state';
      yield 'first delta';
      await waitForNextEvent;
      yield 'live delta';
    }

    const first = registry.join('step:quiz', producer, firstController.signal);
    expect((await first.next()).value).toBe('state');
    expect((await first.next()).value).toBe('first delta');
    firstController.abort();
    expect((await first.next()).done).toBe(true);

    const rejoined = registry.join('step:quiz', producer);
    expect((await rejoined.next()).value).toBe('state');
    expect((await rejoined.next()).value).toBe('first delta');

    const liveEvent = rejoined.next();
    releaseNextEvent?.();
    expect((await liveEvent).value).toBe('live delta');
    expect(producerStarts).toBe(1);
  });
});
