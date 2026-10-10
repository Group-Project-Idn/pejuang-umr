export class IdempotencyRepository {
  private readonly responses = new Map<string, unknown>();

  get<T>(playerId: string, event: string, requestId: string): T | undefined {
    return this.responses.get(this.key(playerId, event, requestId)) as
      | T
      | undefined;
  }

  set<T>(playerId: string, event: string, requestId: string, response: T): T {
    this.responses.set(this.key(playerId, event, requestId), response);
    return response;
  }

  private key(playerId: string, event: string, requestId: string): string {
    return `${playerId}:${event}:${requestId}`;
  }
}
