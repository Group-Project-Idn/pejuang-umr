export class IdempotencyRepository {
  private readonly responses = new Map<
    string,
    { response: unknown; expiresAt: number }
  >();

  constructor(
    private readonly ttlMs = 10 * 60_000,
    private readonly maxEntries = 10_000,
  ) {}

  get<T>(
    playerId: string,
    event: string,
    requestId: string,
    now = Date.now(),
  ): T | undefined {
    const key = this.key(playerId, event, requestId);
    const cached = this.responses.get(key);
    if (!cached) return undefined;
    if (cached.expiresAt <= now) {
      this.responses.delete(key);
      return undefined;
    }
    return cached.response as T;
  }

  set<T>(
    playerId: string,
    event: string,
    requestId: string,
    response: T,
    now = Date.now(),
  ): T {
    this.prune(now);
    const key = this.key(playerId, event, requestId);
    this.responses.delete(key);
    this.responses.set(key, { response, expiresAt: now + this.ttlMs });
    while (this.responses.size > this.maxEntries) {
      const oldestKey = this.responses.keys().next().value;
      if (oldestKey === undefined) break;
      this.responses.delete(oldestKey);
    }
    return response;
  }

  get size(): number {
    return this.responses.size;
  }

  private prune(now: number): void {
    for (const [key, cached] of this.responses) {
      if (cached.expiresAt <= now) this.responses.delete(key);
    }
  }

  private key(playerId: string, event: string, requestId: string): string {
    return `${playerId}:${event}:${requestId}`;
  }
}
