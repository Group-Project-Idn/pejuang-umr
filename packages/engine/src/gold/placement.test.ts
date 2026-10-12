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
  it("mengembalikan heksa tertutup di radius <= 4 dan tidak bersebelahan dengan pion", () => {
    const state = game(["a", "b", "c"]);
    for (const seed of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const hex = pickGoldHex(state, new SequenceRandomSource([seed]))!;
      expect(hex).not.toBeNull();
      expect(getHexDistance(CENTER, hex)).toBeLessThanOrEqual(4);
      expect(state.board.usedHexKeys).not.toContain(hexKey(hex));
      for (const pawn of state.public.pawns) {
        expect(getHexDistance(pawn.hex, hex)).toBeGreaterThan(1);
      }
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
      if (getHexDistance(CENTER, candidate) > 4) continue;
      if (state.public.pawns.some((p) => getHexDistance(p.hex, candidate) <= 1)) continue;
      expect(spread(candidate)).toBeGreaterThanOrEqual(chosen);
    }
  });

  it("pion pemain tereliminasi tetap dihitung untuk syarat tidak bersebelahan", () => {
    const state = game(["a", "b", "c", "d"]);
    const players = {
      ...state.players,
      a: { ...state.players.a!, eliminated: true, eliminatedAtStep: 1 },
    };
    const eliminatedPawn = state.public.pawns.find((p) => p.playerId === "a")!;
    for (const seed of [0, 0.3, 0.6, 0.99]) {
      const hex = pickGoldHex({ ...state, players }, new SequenceRandomSource([seed]))!;
      expect(getHexDistance(eliminatedPawn.hex, hex)).toBeGreaterThan(1);
    }
  });

  it("selisih jarak dihitung hanya ke pemain yang masih hidup", () => {
    const state = game(["a", "b", "c"]);
    const players = {
      ...state.players,
      a: { ...state.players.a!, eliminated: true, eliminatedAtStep: 1 },
    };
    const alive = state.public.pawns.filter((p) => p.playerId !== "a");
    const hex = pickGoldHex({ ...state, players }, new SequenceRandomSource([0.5]))!;
    const spread = (candidate: { q: number; r: number }) => {
      const d = alive.map((p) => getHexDistance(p.hex, candidate));
      return Math.max(...d) - Math.min(...d);
    };
    for (const candidate of createBoard(state.board.radius)) {
      if (state.board.usedHexKeys.includes(hexKey(candidate))) continue;
      if (getHexDistance(CENTER, candidate) > 4) continue;
      if (state.public.pawns.some((p) => getHexDistance(p.hex, candidate) <= 1)) continue;
      expect(spread(candidate)).toBeGreaterThanOrEqual(spread(hex));
    }
  });

  it("seri selisih diacak lewat RandomSource", () => {
    const state = game(["a", "b"]);
    const picks = new Set(
      [0, 0.25, 0.5, 0.75, 0.99].map((seed) =>
        hexKey(pickGoldHex(state, new SequenceRandomSource([seed]))!),
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("tanpa kandidat bersyarat lengkap: longgarkan tidak-bersebelahan dulu, baru radius", () => {
    const state = game(["a", "b"]);
    const all = createBoard(state.board.radius);
    const neighborOfPawn = (hex: { q: number; r: number }) =>
      state.public.pawns.some((p) => getHexDistance(p.hex, hex) <= 1);

    // Semua heksa tertutup radius <= 4 yang tidak bersebelahan dengan pion terpakai.
    const fillSafeInner = all
      .filter((hex) => getHexDistance(CENTER, hex) <= 4 && !neighborOfPawn(hex))
      .map(hexKey);
    const stage2: GameState = {
      ...state,
      board: { ...state.board, usedHexKeys: [...state.board.usedHexKeys, ...fillSafeInner] },
    };
    const hex2 = pickGoldHex(stage2, new SequenceRandomSource([0.5]))!;
    expect(getHexDistance(CENTER, hex2)).toBeLessThanOrEqual(4);
    expect(stage2.board.usedHexKeys).not.toContain(hexKey(hex2));

    // Semua heksa radius <= 4 terpakai: longgarkan radius.
    const fillInner = all.filter((hex) => getHexDistance(CENTER, hex) <= 4).map(hexKey);
    const stage3: GameState = {
      ...state,
      board: { ...state.board, usedHexKeys: [...new Set([...state.board.usedHexKeys, ...fillInner])] },
    };
    const hex3 = pickGoldHex(stage3, new SequenceRandomSource([0.5]))!;
    expect(getHexDistance(CENTER, hex3)).toBeGreaterThan(4);
    expect(stage3.board.usedHexKeys).not.toContain(hexKey(hex3));
  });

  it("mengembalikan null bila semua heksa sudah terpakai", () => {
    const state = game(["a", "b"]);
    const blocked: GameState = {
      ...state,
      board: { ...state.board, usedHexKeys: createBoard(state.board.radius).map(hexKey) },
    };
    expect(pickGoldHex(blocked, new SequenceRandomSource([0.5]))).toBeNull();
  });
});
