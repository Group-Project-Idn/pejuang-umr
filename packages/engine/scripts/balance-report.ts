/**
 * Simulasi keseimbangan pada engine sungguhan -> docs/audit/BALANCE_REPORT.md.
 * Jalankan dari root repo: npm run simulate:balance -w @pejuang/engine
 * Hanya mengukur; tidak mengubah angka aturan. Deterministik (seed tetap).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BALANCE_TARGET,
  BALANCE_V1_14,
  centerOffset,
  DEFAULT_BALANCE,
  distanceToTarget,
  runBalanceBatch,
  type BalanceParams,
  type BatchResult,
  type BotSummary,
  type SeatMode,
} from "../src";

const FULL_GAMES = 500;
const SCREEN_GAMES = 200;
const PLAYER_COUNTS = [2, 3, 4] as const;
const MODES: readonly SeatMode[] = ["smart", "random", "risky", "mixed"];
const FINALISTS = 5;

const GRID = {
  livingCost: [4_600_000, 5_200_000, 5_730_000, 6_200_000, 6_700_000],
  passiveStress: [0, 1],
  financeDivisor: [500_000, 750_000, 1_000_000, 1_500_000],
  zonkMultiplier: [1, 1.5, 2, 2.5],
  realityScale: [1, 1.5, 2],
} as const;

const rp = (value: number) => `Rp${(Math.round(value / 10_000) / 100).toFixed(2).replace(".", ",")} jt`;
const f1 = (value: number) => value.toFixed(1).replace(".", ",");
const pct = (value: number) => `${f1(value)}%`;

function label(balance: BalanceParams): string {
  return `Biaya Hidup ${rp(balance.livingCost)}, stress pasif ${balance.passiveStress}, pembagi ${rp(balance.financeDivisor)}, pengali Zonk ${balance.zonkMultiplier}, efek Realita ${balance.realityScale}x`;
}

function row(name: string, s: BotSummary): string {
  return `| ${name} | ${f1(s.avgScore)} | ${pct(s.highStressPct)} | ${pct(s.doomPct)} (${s.doomPerPlayer.toFixed(2).replace(".", ",")}x) | ${pct(s.bankruptPct)} | ${pct(s.burnoutPct)} | ${pct(s.eliminatedPct)} | ${rp(s.avgWealth)} | ${rp(s.avgDebt)} |`;
}

const TABLE_HEAD = [
  "| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |",
  "|---|---|---|---|---|---|---|---|---|",
].join("\n");

const KIND_NAME = { smart: "Cerdas", random: "Acak", risky: "Pengambil risiko" } as const;

function fullTables(balance: BalanceParams): {
  text: string;
  mixedByCount: BotSummary[];
  smartSoloScore: number;
} {
  const lines: string[] = [];
  const mixedByCount: BotSummary[] = [];
  let smartSoloScore = 0;
  for (const playerCount of PLAYER_COUNTS) {
    lines.push(`**${playerCount} pemain** (${FULL_GAMES} game per baris)`, "", TABLE_HEAD);
    for (const mode of MODES) {
      const result = runBalanceBatch({ playerCount, games: FULL_GAMES, mode, balance });
      if (mode === "mixed") {
        mixedByCount.push(result.overall);
        for (const kind of ["smart", "random", "risky"] as const) {
          lines.push(row(`Campuran: ${KIND_NAME[kind]}`, result.byKind[kind]));
        }
        lines.push(row("**Campuran: semua**", result.overall));
      } else {
        if (mode === "smart" && playerCount === 3) smartSoloScore = result.overall.avgScore;
        lines.push(row(`Satu meja ${KIND_NAME[mode]}`, result.overall));
      }
    }
    lines.push("");
  }
  return { text: lines.join("\n"), mixedByCount, smartSoloScore };
}

function meanDistance(summaries: readonly BotSummary[]): number {
  return summaries.reduce((sum, s) => sum + distanceToTarget(s), 0) / summaries.length;
}

function meetsTarget(s: BotSummary): boolean {
  return distanceToTarget(s) === 0;
}

// 1. Baseline: aturan lama GDD v1.14 (sebelum angka diterapkan).
const baseline = fullTables(BALANCE_V1_14);

// 1b. Aturan resmi v1.15 (bawaan engine).
const official = fullTables(DEFAULT_BALANCE);

// 2. Penyaringan grid: meja campuran 3 pemain.
interface Screened {
  balance: BalanceParams;
  result: BatchResult;
  distance: number;
  offset: number;
}
const screened: Screened[] = [];
for (const livingCost of GRID.livingCost)
  for (const passiveStress of GRID.passiveStress)
    for (const financeDivisor of GRID.financeDivisor)
      for (const zonkMultiplier of GRID.zonkMultiplier)
        for (const realityScale of GRID.realityScale) {
          const balance: BalanceParams = {
            livingCost,
            passiveStress,
            financeDivisor,
            zonkMultiplier,
            realityScale,
          };
          const result = runBalanceBatch({ playerCount: 3, games: SCREEN_GAMES, mode: "mixed", balance });
          screened.push({ balance, result, distance: distanceToTarget(result.overall), offset: centerOffset(result.overall) });
        }
screened.sort((a, b) => a.distance - b.distance || a.offset - b.offset);

// 3. Finalis: 500 game per jumlah pemain, jarak rata-rata 2/3/4 pemain.
// Finalis: terbaik keseluruhan, ditambah yang terbaik dengan stress pasif 1 (opsi GDD v1.14) bila belum ikut.
const picked = screened.slice(0, FINALISTS);
const bestPassive = screened.find((entry) => entry.balance.passiveStress === 1);
if (bestPassive && !picked.includes(bestPassive)) picked.push(bestPassive);
const finalists = picked.map((entry) => {
  const tables = fullTables(entry.balance);
  return { ...entry, tables, finalDistance: meanDistance(tables.mixedByCount) };
});
finalists.sort(
  (a, b) =>
    a.finalDistance - b.finalDistance ||
    a.tables.mixedByCount.reduce((sum, s) => sum + centerOffset(s), 0) -
      b.tables.mixedByCount.reduce((sum, s) => sum + centerOffset(s), 0),
);
const best = finalists[0]!;

// 4. Sensitivitas satu faktor dari baseline (meja campuran 3 pemain).
const oneFactor: string[] = ["| Perubahan dari baseline | Skor | Eliminasi | Doom | Stress >= 8 |", "|---|---|---|---|---|"];
const factors: Array<[string, Partial<BalanceParams>]> = [
  ["Baseline", {}],
  ...GRID.livingCost.filter((v) => v !== BALANCE_V1_14.livingCost).map((v): [string, Partial<BalanceParams>] => [`Biaya Hidup ${rp(v)}`, { livingCost: v }]),
  ["Stress pasif 1 per Ganti Bulan", { passiveStress: 1 }],
  ...GRID.financeDivisor.filter((v) => v !== BALANCE_V1_14.financeDivisor).map((v): [string, Partial<BalanceParams>] => [`Pembagi Poin Keuangan ${rp(v)}`, { financeDivisor: v }]),
  ...GRID.zonkMultiplier.filter((v) => v !== 1).map((v): [string, Partial<BalanceParams>] => [`Pengali Zonk ${v}`, { zonkMultiplier: v }]),
  ...GRID.realityScale.filter((v) => v !== 1).map((v): [string, Partial<BalanceParams>] => [`Efek Realita ${v}x`, { realityScale: v }]),
];
for (const [name, patch] of factors) {
  const s = runBalanceBatch({ playerCount: 3, games: FULL_GAMES, mode: "mixed", balance: { ...BALANCE_V1_14, ...patch } }).overall;
  oneFactor.push(`| ${name} | ${f1(s.avgScore)} | ${pct(s.eliminatedPct)} | ${pct(s.doomPct)} | ${pct(s.highStressPct)} |`);
}

const screenTable = [
  `| # | Kombinasi | Skor | Eliminasi | Doom | Jarak |`,
  `|---|---|---|---|---|---|`,
  ...screened.slice(0, 10).map(
    (e, i) =>
      `| ${i + 1} | ${label(e.balance)} | ${f1(e.result.overall.avgScore)} | ${pct(e.result.overall.eliminatedPct)} | ${pct(e.result.overall.doomPct)} | ${f1(e.distance)} |`,
  ),
].join("\n");

const hits = best.tables.mixedByCount.filter(meetsTarget).length;
const report = [
  "# Laporan Keseimbangan Engine",
  "",
  "Dibuat oleh `packages/engine/scripts/balance-report.ts` (jalankan `npm run simulate:balance -w @pejuang/engine`). Hanya mengukur; tidak ada angka aturan GDD yang diubah. Hasil deterministik untuk seed tetap (seed game ke-i = 1 + i; seed yang sama dipakai di semua kombinasi parameter).",
  "",
  "## 1. Cara ukur",
  "",
  "- Mesin: engine sungguhan (`createGame`, `startRound`, `chooseHex`, `endRound`, `closeBatch`), termasuk katalog 117 petak, Realita, Zonk Musim, Beban Peringkat 1, Petak Emas, Ajakan, Ganti Bulan, dan Doom Spending.",
  "- Bot **Cerdas**: memilih heksa dengan Skor Sementara hasil Rencana terbaik dikurangi perkiraan kerugian Zonk (risiko terkecil), membayar Hutang sebanyak mungkin tiap Ganti Bulan, memilih Event Tanggal dengan skor harapan terbaik.",
  "- Bot **Acak**: semua keputusan acak; Bayar Hutang separuh batas slider.",
  "- Bot **Pengambil risiko**: suka Rencana yang menambah Hutang (Pinjol/Paylater) dan Zonk dasar tinggi, memilih Paylater di Event Tanggal, tidak pernah membayar Hutang.",
  "- Bot tidak pernah kehabisan waktu atau melewatkan Event Tanggal. Ajakan tetap memakai kebijakan acak bawaan simulasi.",
  "- \"Satu meja X\": semua kursi bot jenis X. \"Campuran\": ketiga jenis diputar antar kursi dan game, jadi tiap jenis ikut game yang sama dan tiap kursi bergantian.",
  "- Kolom: Skor rata-rata = Skor Kesejahteraan akhir 0-100 (skor beku untuk yang tereliminasi). Stress >= 8 = persentase pemain dengan Level Stress >= 8 di akhir game. Doom Spending = persentase pemain yang kena minimal sekali (dan rata-rata kali per pemain). Bangkrut/Burnout = persentase pemain tereliminasi karena alasan itu. Kekayaan dan Hutang = rata-rata akhir semua pemain.",
  "- Parameter yang bisa diubah (`GameState.balance`, kosong berarti nilai resmi GDD v1.15): Biaya Hidup, Level Stress pasif per Ganti Bulan (0/1), pembagi Poin Keuangan, pengali Zonk (ukuran efek Realita saat hasilnya Zonk), dan pengali ukuran efek semua Realita. Pengali mengalikan nominal Kekayaan/Hutang (dibulatkan Rp50.000) serta Kesehatan dan Level Stress (dibulatkan, efek tidak hilang jadi 0).",
  "",
  `Target usulan (05_PROJECT_STATE): skor rata-rata ${BALANCE_TARGET.score.min}-${BALANCE_TARGET.score.max}, eliminasi ${BALANCE_TARGET.eliminatedPct.min}-${BALANCE_TARGET.eliminatedPct.max}%, Doom ${BALANCE_TARGET.doomPct.min}-${BALANCE_TARGET.doomPct.max}% pemain.`,
  "",
  "## 2. Baseline: aturan lama GDD v1.14",
  "",
  label(BALANCE_V1_14),
  "",
  baseline.text,
  "## 3. Sensitivitas satu faktor",
  "",
  `Meja campuran 3 pemain, ${FULL_GAMES} game, satu parameter diubah dari baseline v1.14.`,
  "",
  oneFactor.join("\n"),
  "",
  "## 4. Penyaringan kombinasi",
  "",
  `${screened.length} kombinasi (Biaya Hidup x stress pasif x pembagi x pengali Zonk x efek Realita), meja campuran 3 pemain, ${SCREEN_GAMES} game per kombinasi. Jarak = jumlah selisih skor (poin) dan persentase eliminasi/Doom dari rentang target; 0 berarti ketiganya masuk target. 10 terbaik:`,
  "",
  screenTable,
  "",
  `## 5. Finalis (${FULL_GAMES} game per jumlah pemain; urut dari yang terdekat ke tengah target)`,
  "",
  ...finalists.flatMap((f, i) => [
    `### Finalis ${i + 1}: ${label(f.balance)}`,
    "",
    `Jarak rata-rata meja campuran 2/3/4 pemain: ${f1(f.finalDistance)}`,
    "",
    f.tables.text,
  ]),
  "## 6. Rekomendasi",
  "",
  `Kombinasi paling dekat target: **${label(best.balance)}**.`,
  "",
  `Meja campuran memenuhi ketiga target di ${hits} dari ${PLAYER_COUNTS.length} jumlah pemain (jarak rata-rata ${f1(best.finalDistance)}). Angka lengkapnya ada di Finalis ${finalists.indexOf(best) + 1}.`,
  "",
  "Ringkasan finalis (meja campuran, skor / eliminasi / Doom per jumlah pemain 2, 3, 4):",
  "",
  "| Finalis | Kombinasi | 2 pemain | 3 pemain | 4 pemain | Skor bot Cerdas satu meja (3 pemain) |",
  "|---|---|---|---|---|---|",
  ...finalists.map(
    (f, i) =>
      `| ${i + 1} | ${label(f.balance)} | ${f.tables.mixedByCount.map((s) => `${f1(s.avgScore)} / ${pct(s.eliminatedPct)} / ${pct(s.doomPct)}`).join(" | ")} | ${f1(f.tables.smartSoloScore)} |`,
  ),
  "",
  "Pilih kombinasi dengan mempertimbangkan seberapa jauh ia mengubah rasa game: pengali Zonk tinggi membuat satu Zonk jauh lebih menyakitkan, sedangkan Level Stress pasif 1 menekan semua pemain secara merata tiap Ganti Bulan. Baseline (aturan v1.14) sama sekali tidak mendekati target: skor sekitar 80, eliminasi di bawah 3%, Doom di bawah 5%.",
  "",
  "## 7. Ringkasan akhir: aturan resmi GDD v1.15",
  "",
  `Dipilih: Finalis 6, ${label(DEFAULT_BALANCE)} (sekarang bawaan di \`packages/engine/src/economy/balance.ts\`; aturan v1.14 tersimpan sebagai \`BALANCE_V1_14\` untuk perbandingan). Angka di bawah dijalankan ulang dengan bawaan engine, ${FULL_GAMES} game per baris.`,
  "",
  official.text,
  "Meja campuran terhadap target:",
  "",
  "| Pemain | Skor (55-70) | Eliminasi (10-20%) | Doom (25-40%) | Masuk target |",
  "|---|---|---|---|---|",
  ...official.mixedByCount.map(
    (m, i) =>
      `| ${PLAYER_COUNTS[i]} | ${f1(m.avgScore)} | ${pct(m.eliminatedPct)} | ${pct(m.doomPct)} | ${meetsTarget(m) ? "ya" : "tidak"} |`,
  ),
  "",
  "Catatan: ini hasil bot, bukan pemain nyata. Bot cerdas dan pengambil risiko tidak memakai Ajakan secara strategis, dan bot tidak membaca Beban Peringkat 1 selain lewat risiko heksa. Kunci angka sesudah ada uji main dengan manusia.",
  "",
].join("\n");

const outPath = fileURLToPath(new URL("../../../docs/audit/BALANCE_REPORT.md", import.meta.url));
writeFileSync(outPath, report);
console.info(`Laporan ditulis ke docs/audit/BALANCE_REPORT.md; terbaik: ${label(best.balance)}`);
