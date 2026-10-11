import { describe, expect, it } from "vitest";
import { createBoard, getHexDistance, hexKey } from "@pejuang/shared";
import { SequenceRandomSource } from "../random";
import { createGame } from "../game/create-game";
import type { GameState } from "../game/game-state";
import { pickGoldHex } from "./placement";

const CENTER = { q: 0, r: 0 };

function game(playerIds: string[]): GameState {
  return createGame(playerIds, "g", new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]))
    .state;
}

describe("pickGoldHex", () => {
  it("mengembalikan heksa tertutup di jarak >= 4 dari pusat", () => {
    const state = game(["a", "b", "c"]);
    for (const seed of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const hex = pickGoldHex(state, new SequenceRandomSource([seed]))!;
      expect(hex).not.toBeNull();
      expect(getHexDistance(CENTER, hex)).toBeGreaterThanOrEqual(4);
      expect(state.board.usedHexKeys).not.toContain(hexKey(hex));
      expect(state.board.deadHexKeys).not.toContain(hexKey(hex));
    }
  });

  it("memilih kandidat dengan selisih jarak terkecil (adil untuk semua pemain)", () => {
    const state = game(["a", "b", "c", "d"]);
    const hex = pickGoldHex(state, new SequenceRandomSource([0.5]))!;
    const spread = (candidate: { q: number; r: number }) => {
      const distances = state.public.pawns.map((pawn) =>
        getHexDistance(pawn.hex, candidate),
      );
      return Math.max(...distances) - Math.min(...distances);
    };
    const chosen = spread(hex);
    for (const candidate of createBoard(state.board.radius)) {
      const key = hexKey(candidate);
      if (state.board.usedHexKeys.includes(key)) continue;
      if (state.board.deadHexKeys.includes(key)) continue;
      if (getHexDistance(CENTER, candidate) < 4) continue;
      expect(spread(candidate)).toBeGreaterThanOrEqual(chosen);
    }
  });

  it("mengembalikan null bila tidak ada kandidat", () => {
    const state = game(["a", "b"]);
    const outer = createBoard(state.board.radius)
      .filter((hex) => getHexDistance(CENTER, hex) >= 4)
      .map(hexKey);
    const blocked: GameState = {
      ...state,
      board: { ...state.board, usedHexKeys: [...state.board.usedHexKeys, ...outer] },
    };
    expect(pickGoldHex(blocked, new SequenceRandomSource([0.5]))).toBeNull();
  });
});
