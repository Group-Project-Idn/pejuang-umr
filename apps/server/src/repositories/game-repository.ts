import type { PublicGameState } from "@pejuang/shared";

function cloneGame(game: PublicGameState): PublicGameState {
  return structuredClone(game);
}

export class GameRepository {
  private readonly games = new Map<string, PublicGameState>();

  set(roomCode: string, game: PublicGameState): PublicGameState {
    this.games.set(roomCode, cloneGame(game));
    return cloneGame(game);
  }

  get(roomCode: string): PublicGameState | null {
    const game = this.games.get(roomCode);
    return game ? cloneGame(game) : null;
  }

  delete(roomCode: string): void {
    this.games.delete(roomCode);
  }
}
