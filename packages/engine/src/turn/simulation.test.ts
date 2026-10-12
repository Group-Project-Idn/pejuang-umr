import { afterAll, describe, expect, it } from "vitest";
import { ReflectionSchema, hexKey } from "@pejuang/shared";
import { buildPlayerReflection } from "../reflection/rules-insight";
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
const pointSums = { finance: 0, health: 0, calm: 0 };
const finalWealth: number[] = [];
const finalDebts: number[] = [];
let doomCount = 0;
let doomTotal = 0;
/** Statistik Ajakan per motif dan jawaban (dari invite:resolved milik pengirim). */
const inviteStats: Record<string, number> = {};
const inviteCounts: number[] = [];
let inviteJoin = 0;
let inviteDecline = 0;
let inviteAuto = 0;

const rupiah = (value: number) => Math.round(value).toLocaleString("id-ID");
const mean = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
const reasons: Record<string, number> = {};
let totalPlayers = 0;
let eliminatedPlayers = 0;

afterAll(() => {
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  const pct = (count: number) => `${((count / (totalPlayers || 1)) * 100).toFixed(1)}%`;
  const indebted = finalDebts.filter((debt) => debt > 0);
  const inviteTotal = inviteJoin + inviteDecline;
  const motiveLines = ["sincere", "commission"].map((motive) => {
    const join = inviteStats[`${motive}:join`] ?? 0;
    const decline = inviteStats[`${motive}:decline`] ?? 0;
    const auto = inviteStats[`${motive}:auto`] ?? 0;
    return `  ${motive}: Ikut ${join}, Tolak ${decline} (habis waktu ${auto})`;
  });
  console.info(
    [
      `Simulasi ${GAME_COUNT} game (${totalPlayers} pemain)`,
      `- rata-rata Skor Kesejahteraan akhir: ${mean(finalScores).toFixed(2)}`,
      `  Poin Keuangan ${(pointSums.finance / (totalPlayers || 1)).toFixed(2)}, Kesehatan ${(pointSums.health / (totalPlayers || 1)).toFixed(2)}, Ketenangan ${(pointSums.calm / (totalPlayers || 1)).toFixed(2)}`,
      `- pemain tereliminasi: ${pct(eliminatedPlayers)}; alasan terbanyak: ${topReason ? `${topReason[0]} (${topReason[1]})` : "tidak ada"}`,
      `  rincian per alasan: ${Object.entries(reasons).map(([reason, count]) => `${reason} ${pct(count)}`).join(", ") || "tidak ada"}`,
      `- Doom Spending: ${(doomCount / (totalPlayers || 1)).toFixed(2)}x per pemain, rata-rata Rp${rupiah(doomTotal / (totalPlayers || 1))} per pemain`,
      `- berhutang di akhir: ${pct(indebted.length)}; rata-rata Hutang (yang berhutang) Rp${rupiah(mean(indebted))}`,
      `- rata-rata Kekayaan akhir: Rp${rupiah(mean(finalWealth))}`,
      `Ajakan: ${mean(inviteCounts).toFixed(2)} per game (${inviteTotal} total)`,
      `- Ikut ${((inviteJoin / (inviteTotal || 1)) * 100).toFixed(1)}%, Tolak ${((inviteDecline / (inviteTotal || 1)) * 100).toFixed(1)}% (termasuk habis waktu ${inviteAuto})`,
      ...motiveLines,
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
      const revealedRounds = new Set<number>();

      const { state, events, initialUsedHexKeys, playerIds, inviteLog } =
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
          // Realita yang belum dibuka tidak boleh bocor ke state publik maupun event.
          for (const hidden of current.pendingRealities) {
            const entry = current.public.openedHexes.find(
              (opened) =>
                opened.byPlayerId === hidden.playerId &&
                opened.step === current.public.calendar.step &&
                hexKey(opened.hex) === hexKey(hidden.hex),
            );
            if (!entry || entry.reality !== null || entry.outcome !== null) {
              fail(`openedHexes memuat Realita tersembunyi ${hidden.playerId}`);
            }
            if (produced.some((e) => JSON.stringify(e.payload).includes(hidden.text))) {
              fail(`event memuat Realita tersembunyi ${hidden.playerId}`);
            }
          }
          // Log keputusan privat: tidak di state publik dan tidak di payload event mana pun.
          if (index % 4 === 0 && JSON.stringify(current.public).includes("decisionLog")) {
            fail("public memuat decisionLog");
          }
          for (const e of index % 4 === 0 ? produced : []) {
            const json = JSON.stringify(e.payload);
            if (json.includes("decisionLog") || json.includes('"kind":"roundEnd"') || json.includes('"tileId"')) {
              fail(`event ${e.type} memuat log keputusan`);
            }
            // Motif tidak keluar sebelum Fase Pembalikan: hanya invite:resolved dan invite:card yang boleh memuatnya.
            if (json.includes('"motive"') && e.type !== "invite:resolved" && e.type !== "invite:card") {
              fail(`event ${e.type} memuat motive`);
            }
          }
          if (
            current.phase === "monthChange" &&
            produced.some((e) => e.type === "calendar:event" || e.type === "turn:start")
          ) {
            fail("Event Tanggal atau giliran dimulai saat popup Ganti Bulan masih terbuka");
          }
          for (const event of produced) {
            // tile:resolved ronde N selalu setelah round:reveal ronde N.
            if (event.type === "round:reveal") revealedRounds.add(event.payload.round);
            if (event.type === "tile:resolved") {
              const round = event.payload.round;
              if (round === undefined || !revealedRounds.has(round)) {
                fail(`tile:resolved ronde ${round} sebelum round:reveal`);
              }
              if (round !== current.public.calendar.step && round !== current.public.calendar.step - 1) {
                fail(`tile:resolved ronde ${round} di langkah ${current.public.calendar.step}`);
              }
            }
            // invite:resolved selalu di batch yang sama dengan, dan setelah, round:reveal ronde itu.
            if (event.type === "invite:resolved") {
              const batchReveal = produced.findIndex((e) => e.type === "round:reveal");
              if (batchReveal < 0 || batchReveal > produced.indexOf(event)) {
                fail("invite:resolved tidak setelah round:reveal");
              }
              // Motif hanya ke pengirim dan target, tidak ke pemain ketiga.
              const receiver = event.target.kind === "player" ? event.target.playerId : null;
              if (receiver !== event.payload.fromPlayerId && receiver !== event.payload.targetPlayerId) {
                fail(`invite:resolved (motif) dikirim ke pihak ketiga ${receiver}`);
              }
            }
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

      // Setiap Ajakan terkirim dihitung sekali dan diselesaikan di Fase Pembalikan.
      if (ofType(events, "invite:incoming").length !== inviteLog.length) {
        fail("jumlah invite:incoming tidak sama dengan Ajakan terkirim");
      }
      if (ofType(events, "invite:resolved").length !== inviteLog.length * 2) {
        fail("invite:resolved bukan 2 per Ajakan (pengirim dan target)");
      }
      inviteCounts.push(inviteLog.length);
      for (const entry of inviteLog) {
        if (entry.answer === "join") inviteJoin += 1;
        else inviteDecline += 1;
        if (entry.autoDeclined) inviteAuto += 1;
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
        pointSums.finance += row.points?.finance ?? 0;
        pointSums.health += row.points?.health ?? 0;
        pointSums.calm += row.points?.calm ?? 0;
        totalPlayers += 1;
        if (row.eliminated) eliminatedPlayers += 1;
      }
      // Log keputusan: langkah tidak menurun, indikator akhir ronde ada, dan insight valid.
      for (const playerId of playerIds) {
        const entries = state.decisionLog[playerId] ?? [];
        for (let i = 1; i < entries.length; i += 1) {
          if (entries[i]!.step < entries[i - 1]!.step) fail(`log ${playerId} langkah menurun`);
        }
        if (!entries.some((entry) => entry.kind === "roundEnd")) fail(`log ${playerId} tanpa roundEnd`);
        const reflection = buildPlayerReflection(state, playerId);
        if (!ReflectionSchema.safeParse(reflection).success || reflection?.source !== "rules") {
          fail(`insight ${playerId} tidak lolos ReflectionSchema`);
        }
        const status = state.players[playerId]!.status;
        finalWealth.push(status.wealth);
        finalDebts.push(status.debt);
        for (const entry of entries) {
          if (entry.kind === "doom") {
            doomCount += 1;
            doomTotal += entry.amount;
          }
        }
      }
      for (const resolved of ofType(events, "invite:resolved")) {
        if (resolved.target.kind !== "player" || resolved.target.playerId !== resolved.payload.fromPlayerId) continue;
        const outcome = resolved.payload.autoDeclined ? "auto" : resolved.payload.answer;
        const key = `${resolved.payload.motive}:${outcome}`;
        inviteStats[key] = (inviteStats[key] ?? 0) + 1;
      }
      for (const playerId of playerIds) {
        const reason = state.players[playerId]!.eliminatedReason;
        if (reason) reasons[reason] = (reasons[reason] ?? 0) + 1;
      }
    }

    expect(violations.slice(0, 20)).toEqual([]);
  }, 30_000);
});
