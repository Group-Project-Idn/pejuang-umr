import type { GameSession } from "../game/game-session";

export class GameRepository {
  private readonly sessions = new Map<string, GameSession>();

  set(roomCode: string, session: GameSession): GameSession {
    this.sessions.set(roomCode, session);
    return session;
  }

  get(roomCode: string): GameSession | null {
    return this.sessions.get(roomCode) ?? null;
  }

  delete(roomCode: string): void {
    this.sessions.delete(roomCode);
  }
}
