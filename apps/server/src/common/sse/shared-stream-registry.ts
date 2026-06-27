class SharedStreamSession<T> {
  private readonly events: T[] = [];
  private readonly waiters = new Set<() => void>();
  private ended = false;
  private failure: unknown;

  publish(event: T) {
    if (this.ended) return;
    this.events.push(event);
    this.wakeSubscribers();
  }

  complete() {
    this.ended = true;
    this.wakeSubscribers();
  }

  fail(error: unknown) {
    this.failure = error;
    this.ended = true;
    this.wakeSubscribers();
  }

  async *subscribe(signal?: AbortSignal): AsyncGenerator<T> {
    let index = 0;

    while (!signal?.aborted) {
      while (index < this.events.length) {
        yield this.events[index++];
      }

      if (signal?.aborted) return;
      if (this.failure) throw this.failure;
      if (this.ended) return;
      await this.waitForEvent(signal);
    }
  }

  private waitForEvent(signal?: AbortSignal) {
    return new Promise<void>((resolve) => {
      if (signal?.aborted) {
        resolve();
        return;
      }

      const wake = () => {
        this.waiters.delete(wake);
        signal?.removeEventListener('abort', wake);
        resolve();
      };

      this.waiters.add(wake);
      signal?.addEventListener('abort', wake, { once: true });
    });
  }

  private wakeSubscribers() {
    for (const wake of [...this.waiters]) wake();
  }
}

/**
 * Keeps one producer alive per key while allowing pages to leave and rejoin its
 * event stream. Rejoining subscribers receive the recorded events first, then
 * continue with live events from the same producer.
 */
export class SharedStreamRegistry<T> {
  private readonly sessions = new Map<string, SharedStreamSession<T>>();

  constructor(private readonly retentionMs = 30_000) {}

  async *join(
    key: string,
    producer: () => AsyncGenerator<T>,
    signal?: AbortSignal,
  ): AsyncGenerator<T> {
    let session = this.sessions.get(key);
    if (!session) {
      session = new SharedStreamSession<T>();
      this.sessions.set(key, session);
      void this.runProducer(key, session, producer);
    }

    yield* session.subscribe(signal);
  }

  private async runProducer(
    key: string,
    session: SharedStreamSession<T>,
    producer: () => AsyncGenerator<T>,
  ) {
    try {
      for await (const event of producer()) session.publish(event);
      session.complete();
    } catch (error) {
      session.fail(error);
    } finally {
      const timer = setTimeout(() => {
        if (this.sessions.get(key) === session) this.sessions.delete(key);
      }, this.retentionMs);
      timer.unref();
    }
  }
}
