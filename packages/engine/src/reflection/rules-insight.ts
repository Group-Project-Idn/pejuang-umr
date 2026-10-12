import { formatRupiah, type PrivateStatus, type Reflection } from "@pejuang/shared";
import type { GameState } from "../game/game-state";
import type { DecisionEntry } from "../log/decision-log";

type Insight = Reflection["insights"][number];
type Entry<K extends DecisionEntry["kind"]> = Extract<DecisionEntry, { kind: K }>;

/** Petak Pinjol / Paylater di katalog (GDD 5.1). */
const LOAN_TILE_ID = "online-loan";

const MAX_INSIGHTS = 3;
/** Jumlah minimum kejadian sebelum sebuah pola dianggap pola. */
const MIN_LOAN_PICKS = 2;
const MIN_DOOM = 2;
const MIN_LOW_ROUNDS = 3;
const MIN_PAYMENT_PROMPTS = 2;
const MIN_COMMISSION_JOINS = 2;
/** Kesehatan sampai ambang ini dianggap rendah (batas Burnout GDD 1.4). */
const LOW_HEALTH = 3;
const HIGH_STRESS = 8;

function ofKind<K extends DecisionEntry["kind"]>(
  log: readonly DecisionEntry[],
  kind: K,
): Entry<K>[] {
  return log.filter((entry): entry is Entry<K> => entry.kind === kind);
}

interface Candidate {
  /** Makin tinggi makin penting; dipakai memilih maksimal 3 insight. */
  weight: number;
  insight: Insight;
}

function loanInsight(log: readonly DecisionEntry[], status: PrivateStatus): Candidate | null {
  const picks = ofKind(log, "tile").filter((entry) => entry.tileId === LOAN_TILE_ID);
  if (picks.length < MIN_LOAN_PICKS) return null;
  const debtEnd = status.debt > 0 ? ` Hutangmu di akhir ${formatRupiah(status.debt)}.` : "";
  return {
    weight: 90 + picks.length,
    insight: {
      title: "Pinjol / Paylater jadi andalan",
      body:
        `Kamu memilih Pinjol / Paylater sebanyak ${picks.length} kali.${debtEnd} ` +
        "Dananya langsung cair, tapi bunga 3% per bulan terus berjalan dan Level Stress ikut naik tiap Hutang melewati kelipatan Rp5.000.000. " +
        "Kalau kamu sering butuh dana cepat, pelan-pelan sisihkan Kekayaan sebagai bantalan bisa meringankan.",
    },
  };
}

function doomInsight(log: readonly DecisionEntry[]): Candidate | null {
  const dooms = ofKind(log, "doom");
  if (dooms.length < MIN_DOOM) return null;
  const total = dooms.reduce((sum, entry) => sum + entry.amount, 0);
  return {
    weight: 80 + dooms.length,
    insight: {
      title: "Doom Spending berulang",
      body:
        `Doom Spending terjadi ${dooms.length} kali dengan total ${formatRupiah(total)}. ` +
        "Level Stress 9 ke atas memicu belanja impulsif di akhir ronde. " +
        "Memilih petak yang menurunkan Level Stress lebih awal bisa mencegahnya, sebelum Kekayaan terkuras.",
    },
  };
}

function healthInsight(log: readonly DecisionEntry[]): Candidate | null {
  const lowRounds = ofKind(log, "roundEnd").filter((entry) => entry.health <= LOW_HEALTH).length;
  if (lowRounds < MIN_LOW_ROUNDS) return null;
  return {
    weight: 85 + lowRounds,
    insight: {
      title: "Kesehatan sering rendah",
      body:
        `Kesehatanmu berada di angka ${LOW_HEALTH} atau lebih rendah selama ${lowRounds} ronde. ` +
        "Kesehatan 0 bisa berujung Burnout, jadi petak seperti Istirahat Penuh atau Olahraga Pagi layak diselipkan sebelum terlalu mepet.",
    },
  };
}

function stressInsight(log: readonly DecisionEntry[]): Candidate | null {
  const highRounds = ofKind(log, "roundEnd").filter((entry) => entry.stress >= HIGH_STRESS).length;
  if (highRounds < MIN_LOW_ROUNDS) return null;
  return {
    weight: 75 + highRounds,
    insight: {
      title: "Level Stress tinggi cukup lama",
      body:
        `Level Stress kamu ${HIGH_STRESS} atau lebih selama ${highRounds} ronde. ` +
        "Di angka segitu keputusan cenderung terburu-buru. Jeda sebentar lewat petak yang menenangkan sering lebih hemat daripada memaksakan jalan terus.",
    },
  };
}

function paymentInsight(log: readonly DecisionEntry[]): Candidate | null {
  const payments = ofKind(log, "debtPayment");
  if (payments.length < MIN_PAYMENT_PROMPTS) return null;
  const paid = payments.filter((entry) => entry.amount > 0);
  if (paid.length === 0) {
    return {
      weight: 70,
      insight: {
        title: "Hutang belum dicicil",
        body:
          `Kamu punya Hutang di ${payments.length} Ganti Bulan, tapi Bayar Hutang selalu Rp0. ` +
          "Bunga dihitung dari total Hutang tiap bulan, jadi mencicil sedikit saja bisa memperkecil bunga berikutnya.",
      },
    };
  }
  if (paid.length === payments.length) {
    const total = paid.reduce((sum, entry) => sum + entry.amount, 0);
    return {
      weight: 60,
      insight: {
        title: "Rutin Bayar Hutang",
        body:
          `Kamu rutin Bayar Hutang di setiap Ganti Bulan, total ${formatRupiah(total)}. ` +
          "Kebiasaan ini menahan bunga supaya tidak menumpuk.",
      },
    };
  }
  return null;
}

function inviteInsight(log: readonly DecisionEntry[]): Candidate | null {
  const results = ofKind(log, "inviteResult");
  const commissionJoins = results.filter(
    (entry) => entry.role === "target" && entry.motive === "commission" && entry.answer === "join",
  );
  if (commissionJoins.length >= MIN_COMMISSION_JOINS) {
    return {
      weight: 65,
      insight: {
        title: "Sering ikut Ajakan Komisi",
        body:
          `Kamu ikut ${commissionJoins.length} Ajakan yang ternyata bermotif Komisi, masing-masing dengan biaya tersembunyi Rp500.000. ` +
          "Tidak semua Ajakan bisa dibaca dari luar. Melihat Rencana dan siapa pengirimnya bisa membantu menimbang sebelum ikut.",
      },
    };
  }
  const sent = ofKind(log, "inviteSent");
  if (sent.length >= MIN_COMMISSION_JOINS) {
    return {
      weight: 40,
      insight: {
        title: "Aktif mengajak pemain lain",
        body: `Kamu mengirim ${sent.length} Ajakan sepanjang game. Interaksi ini bisa menurunkan Level Stress, tapi hasilnya bergantung pada motif dan jawaban lawan.`,
      },
    };
  }
  return null;
}

function steadyInsight(status: PrivateStatus): Candidate {
  if (status.debt === 0) {
    return {
      weight: 10,
      insight: {
        title: "Keuangan tetap sehat",
        body: `Kamu menutup game tanpa Hutang dan Kekayaan ${formatRupiah(status.wealth)}. Kombinasi ini memberi ruang gerak saat ada pengeluaran mendadak.`,
      },
    };
  }
  return {
    weight: 10,
    insight: {
      title: "Hutang masih ada di akhir",
      body: `Hutangmu ${formatRupiah(status.debt)} dan Kekayaanmu ${formatRupiah(status.wealth)}. Melihat selisih keduanya setiap Ganti Bulan membantu menjaga arah.`,
    },
  };
}

function summaryOf(log: readonly DecisionEntry[], status: PrivateStatus): string {
  const first =
    `Di akhir game, Kekayaanmu ${formatRupiah(status.wealth)}, Hutang ${formatRupiah(status.debt)}, ` +
    `Kesehatan ${status.health}, dan Level Stress ${status.stress}.`;
  const tiles = ofKind(log, "tile").length;
  const rounds = ofKind(log, "roundEnd").length;
  if (tiles === 0) return first;
  return `${first} Kamu melangkah ${tiles} kali selama ${rounds} ronde.`;
}

/**
 * Insight berbasis aturan dari log keputusan (GDD 6.5): fungsi murni, tanpa LLM.
 * Hasil lolos `ReflectionSchema` dengan `source: "rules"`, berisi ringkasan 1-2 kalimat
 * dan 1-3 insight berbahasa santai, tanpa `reference` (buku hanya untuk LLM nanti).
 */
export function buildRuleInsights(
  log: readonly DecisionEntry[],
  finalStatus: PrivateStatus,
): Reflection {
  const candidates = [
    loanInsight(log, finalStatus),
    healthInsight(log),
    doomInsight(log),
    stressInsight(log),
    paymentInsight(log),
    inviteInsight(log),
  ]
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_INSIGHTS);
  if (candidates.length === 0) candidates.push(steadyInsight(finalStatus));
  return {
    source: "rules",
    summary: summaryOf(log, finalStatus),
    insights: candidates.map((candidate) => candidate.insight),
  };
}

/** Log keputusan satu pemain (salinan; kosong bila pemain tidak dikenal). */
export function getDecisionLog(state: GameState, playerId: string): DecisionEntry[] {
  return [...(state.decisionLog[playerId] ?? [])];
}

/** Refleksi berbasis aturan untuk satu pemain (dipakai server di G6). */
export function buildPlayerReflection(state: GameState, playerId: string): Reflection | null {
  const player = state.players[playerId];
  if (!player) return null;
  return buildRuleInsights(getDecisionLog(state, playerId), player.status);
}
