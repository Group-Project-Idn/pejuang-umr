import { afterAll, describe, expect, it } from "vitest";
import { hexKey } from "@pejuang/shared";
import type { DomainEvent } from "../game/domain-events";
import { playRandomGame } from "./simulation-helpers";

const GAME_COUNT = 200;
const DEBT_LIMIT = 25_000_000;
const MONTH_CHANGES = 11;

function ofType<T extends DomainEvent["type"]>(events: readonly DomainEvent[], type: T) {
  return events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
}

const finalScores: number[] = [];
const reasons: Record<string, number> = {};
let totalPlayers = 0;
let eliminatedPlayers = 0;

afterAll(() => {
  const average = finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length;
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  console.info(
    [
      `Simulasi ${GAME_COUNT} game (${totalPlayers} pemain)`,
      `- rata-rata skor akhir: ${Math.round(average).toLocaleString("id-ID")}`,
      `- pemain tereliminasi: ${((eliminatedPlayers / totalPlayers) * 100).toFixed(1)}%`,
      `- alasan eliminasi terbanyak: ${topReason ? `${topReason[0]} (${topReason[1]})` : "tidak ada"}`,
      `- rincian: ${JSON.stringify(reasons)}`,
    ].join("\n"),
  );
});

describe("simulasi game penuh", () => {
  it(`${GAME_COUNT} game acak memenuhi semua invarian`, () => {
    const violations: string[] = [];

    for (let index = 0; index < GAME_COUNT; index += 1) {
      const playerCount = 2 + (index % 3);
      const seed = index + 1;
      const label = `seed ${seed} (${playerCount} pemain)`;
      const fail = (message: string) => violations.push(`${label}: ${message}`);
      const eliminatedSoFar = new Set<string>();

      const { state, events, initialUsedHexKeys, playerIds } = playRandomGame(
        playerCount,
        seed,
        (current, produced) => {
          for (const [playerId, player] of Object.entries(current.players)) {
            const { health, stress, wealth, debt } = player.status;
            if (!Number.isInteger(health) || health < 0 || health > 10) {
              fail(`Kesehatan ${health} di luar 0-10 (${playerId})`);
            }
            if (!Number.isInteger(stress) || stress < 0 || stress > 10) {
              fail(`Level Stress ${stress} di luar 0-10 (${playerId})`);
            }
            if (!Number.isInteger(wealth) || wealth < 0) fail(`Kekayaan ${wealth} (${playerId})`);
            if (!Number.isInteger(debt) || debt < 0 || debt > DEBT_LIMIT) {
              fail(`Hutang ${debt} di luar 0-${DEBT_LIMIT} (${playerId})`);
            }
          }
          for (const event of produced) {
            if (event.type === "turn:start" && eliminatedSoFar.has(event.payload.playerId)) {
              fail(`pemain tereliminasi ${event.payload.playerId} mendapat giliran`);
            }
            if (
              event.type === "month:summary" &&
              event.target.kind === "player" &&
              eliminatedSoFar.has(event.target.playerId)
            ) {
              fail(`pemain tereliminasi ${event.target.playerId} mendapat month:summary`);
            }
            if (event.type === "player:eliminated") eliminatedSoFar.add(event.payload.playerId);
          }
        },
      );

      // Selesai dengan satu game:finished.
      if (state.phase !== "finished") fail(`phase ${state.phase}`);
      const finished = ofType(events, "game:finished");
      if (finished.length !== 1) fail(`${finished.length} event game:finished`);

      // Tidak ada heksa yang diinjak dua kali.
      const stepped = state.public.openedHexes.map((opened) => hexKey(opened.hex));
      if (new Set(stepped).size !== stepped.length) fail("heksa terbuka ganda");
      for (const key of stepped) {
        if (initialUsedHexKeys.includes(key)) fail(`titik awal ${key} diinjak`);
      }

      // Ganti bulan: tepat 11 kali untuk yang bertahan.
      for (const playerId of playerIds) {
        const summaries = ofType(events, "month:summary").filter(
          (e) => e.target.kind === "player" && e.target.playerId === playerId,
        ).length;
        const player = state.players[playerId]!;
        if (!player.eliminated && summaries !== MONTH_CHANGES) {
          fail(`${playerId} bertahan tetapi ganti bulan ${summaries}x`);
        }
        if (player.eliminated && summaries > MONTH_CHANGES) {
          fail(`${playerId} ganti bulan ${summaries}x`);
        }
      }

      // Ranking memuat semua pemain tepat sekali.
      const ranking = finished[0]?.payload.ranking ?? [];
      const rankedIds = ranking.map((row) => row.playerId).sort();
      if (JSON.stringify(rankedIds) !== JSON.stringify([...playerIds].sort())) {
        fail(`ranking berisi ${rankedIds.join(",")}`);
      }

      for (const row of ranking) {
        finalScores.push(row.finalScore);
        totalPlayers += 1;
        if (row.eliminated) eliminatedPlayers += 1;
      }
      for (const playerId of playerIds) {
        const reason = state.players[playerId]!.eliminatedReason;
        if (reason) reasons[reason] = (reasons[reason] ?? 0) + 1;
      }
    }

    expect(violations.slice(0, 20)).toEqual([]);
  });
});
