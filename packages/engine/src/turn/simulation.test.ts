import { afterAll, describe, expect, it } from "vitest";
import { hexKey } from "@pejuang/shared";
import type { DomainEvent } from "../game/domain-events";
import { playRandomGame } from "./simulation-helpers";

const GAME_COUNT = 200;
const DEBT_LIMIT = 25_000_000;
const MONTH_CHANGES = 11;
const TOTAL_STEPS = 24;

function ofType<T extends DomainEvent["type"]>(events: readonly DomainEvent[], type: T) {
  return events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
}

const finalScores: number[] = [];
const inviteCounts: number[] = [];
let inviteJoin = 0;
let inviteDecline = 0;
let inviteAuto = 0;
let inviteLimitRejections = 0;
const senderDeltas: number[] = [];
const targetDeltas: number[] = [];

const mean = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
const rupiah = (value: number) => Math.round(value).toLocaleString("id-ID");
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
      `Ajakan: ${mean(inviteCounts).toFixed(2)} per game (${inviteJoin + inviteDecline} total, ${inviteLimitRejections} ditolak INVITE_LIMIT)`,
      `- Ikut ${((inviteJoin / (inviteJoin + inviteDecline || 1)) * 100).toFixed(1)}%, Tolak ${((inviteDecline / (inviteJoin + inviteDecline || 1)) * 100).toFixed(1)}% (termasuk habis waktu ${inviteAuto})`,
      `- dampak rata-rata ke Skor Sementara sesaat setelah dijawab: pengirim ${rupiah(mean(senderDeltas))}, target ${rupiah(mean(targetDeltas))}`,
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

      const { state, events, initialUsedHexKeys, playerIds, inviteLog, inviteLimitRejections: limited } =
        playRandomGame(
        playerCount,
        seed,
        (current, produced) => {
          // Heksa Mati dihapus (v1.12): tidak ada di state publik maupun papan.
          if (current.public.deadHexes.length > 0) fail("public.deadHexes tidak kosong");
          if ("deadHexKeys" in current.board) fail("board memuat deadHexKeys");
          // Isi petak asli di bawah Petak Emas tidak pernah dikirim ke klien.
          const origin = current.board.goldOrigin;
          if (origin) {
            if (current.board.tiles[origin.hexKey] !== current.public.gold?.goldId) {
              fail("goldOrigin tidak cocok dengan Petak Emas aktif");
            }
            const needle = `"${origin.tileId}"`;
            if (JSON.stringify(current.public).includes(needle)) fail("public memuat isi asli");
            if (produced.some((e) => JSON.stringify(e.payload).includes(needle))) {
              fail("event memuat isi petak asli");
            }
          }
          // Privasi: JSON public state tidak memuat isi heksa selain Petak Emas aktif.
          if (
            index % 5 === 0 &&
            produced.some((e) => e.type === "tile:opened" || e.type === "gold:spawned")
          ) {
            const publicJson = JSON.stringify(current.public);
            const activeGold = current.public.gold;
            if (activeGold && current.board.tiles[hexKey(activeGold.hex)] !== activeGold.goldId) {
              fail(`Petak Emas ${activeGold.goldId} tidak cocok dengan isi heksanya`);
            }
            for (const tileId of Object.values(current.board.tiles)) {
              if (tileId === activeGold?.goldId) continue;
              if (publicJson.includes(`"${tileId}"`)) fail(`public state membocorkan "${tileId}"`);
            }
          }
          for (const [playerId, player] of Object.entries(current.players)) {
            const { health, stress, wealth, debt } = player.status;
            if (!Number.isInteger(health) || health < 0 || health > 10) {
              fail(`Kesehatan ${health} di luar 0-10 (${playerId})`);
            }
            if (!Number.isInteger(stress) || stress < 0 || stress > 10) {
              fail(`Level Stress ${stress} di luar 0-10 (${playerId})`);
            }
            if (!Number.isInteger(wealth) || wealth < 0) fail(`Kekayaan ${wealth} (${playerId})`);
            // Hutang tanpa batas atas (GDD 2.3 v1.12); Bangkrut bila > DEBT_LIMIT.
            if (!Number.isInteger(debt) || debt < 0) fail(`Hutang ${debt} (${playerId})`);
            if (player.eliminatedReason === "bankrupt" && debt <= DEBT_LIMIT) {
              fail(`Bangkrut dengan Hutang ${debt} <= ${DEBT_LIMIT} (${playerId})`);
            }
          }
          for (const event of produced) {
            // Motif rahasia: tidak boleh ada di event room maupun invite:incoming.
            if (
              (event.target.kind === "room" || event.type === "invite:incoming") &&
              JSON.stringify(event.payload).includes("motive")
            ) {
              fail(`event ${event.type} memuat motive`);
            }
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

      // Maksimal 1 Ajakan sukses per ronde (langkah).
      const perStep = new Map<number, number>();
      for (const entry of inviteLog) perStep.set(entry.step, (perStep.get(entry.step) ?? 0) + 1);
      for (const [step, count] of perStep) {
        if (count > 1) fail(`${count} Ajakan sukses di langkah ${step}`);
      }
      if (ofType(events, "invite:incoming").length !== inviteLog.length) {
        fail("jumlah invite:incoming tidak sama dengan Ajakan sukses");
      }
      inviteCounts.push(inviteLog.length);
      inviteLimitRejections += limited;
      for (const entry of inviteLog) {
        if (entry.answer === "join") inviteJoin += 1;
        else inviteDecline += 1;
        if (entry.autoDeclined) inviteAuto += 1;
        senderDeltas.push(entry.senderScoreDelta);
        targetDeltas.push(entry.targetScoreDelta);
      }

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

      // Game boleh selesai sebelum Langkah 24, tetapi hanya bila <= 1 pemain hidup.
      const reachedLastStep = state.public.calendar.step >= TOTAL_STEPS;
      const alive = playerIds.filter((id) => !state.players[id]!.eliminated).length;
      if (!reachedLastStep && alive > 1) {
        fail(`selesai di langkah ${state.public.calendar.step} dengan ${alive} pemain hidup`);
      }

      // Ganti bulan: tepat 11 kali untuk yang bertahan, hanya bila game mencapai Langkah 24.
      for (const playerId of playerIds) {
        const summaries = ofType(events, "month:summary").filter(
          (e) => e.target.kind === "player" && e.target.playerId === playerId,
        ).length;
        const player = state.players[playerId]!;
        if (!player.eliminated && reachedLastStep && summaries !== MONTH_CHANGES) {
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
