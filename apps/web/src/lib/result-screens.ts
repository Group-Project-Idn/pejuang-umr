import type {
  Ack,
  EliminationReason,
  GameFinishedPayload,
  PrivateStatus,
  PublicGameState,
  RoomState,
  Snapshot,
} from "@pejuang/shared";

export type RoomScreen = "waiting" | "game" | "elimination" | "result";

/**
 * Memilih layar room. Status room menang atas sisa state game lama:
 * setelah Main Lagi room kembali "waiting" walau result lama belum terhapus.
 */
export function selectRoomScreen(input: {
  room: RoomState | null;
  game: PublicGameState | null;
  result: Snapshot["result"];
  playerId: string | null;
}): RoomScreen {
  const { room, game, result, playerId } = input;
  if (!room || room.status === "waiting" || room.status === "countdown") {
    return "waiting";
  }
  if (room.status === "finished" || result) return "result";
  if (!game) return "waiting";
  if (playerId && game.eliminated.includes(playerId)) return "elimination";
  return "game";
}

/** Alasan eliminasi pemain dari state publik (eliminationReasons dari server). */
export function getEliminationReason(
  game: PublicGameState | null,
  playerId: string | null,
): EliminationReason | null {
  if (!game || !playerId) return null;
  return game.eliminationReasons.find((entry) => entry.playerId === playerId)?.reason ?? null;
}

export const ELIMINATION_REASON_LABEL: Record<EliminationReason, string> = {
  bankrupt: "Bangkrut",
  burnout: "Burnout Total",
};

/** Skor desimal 0-100 ditampilkan sebagai bilangan bulat (GDD 6.2). */
export function formatScore(score: number): number {
  return Math.round(score);
}

export const REMATCH_COPY = {
  waitingHost: "Menunggu host memulai Main Lagi",
  noPlayers: "Tidak ada pemain yang bisa main lagi. Kembali ke Lobby.",
  notHost: "Hanya host yang bisa melakukan ini.",
} as const;

export function getRematchMessage(response: Ack<object>): string {
  if (response.ok) return "";
  if (response.error === "NOT_ENOUGH_PLAYERS") return REMATCH_COPY.noPlayers;
  if (response.error === "NOT_HOST") return REMATCH_COPY.notHost;
  return `Gagal: ${response.error}`;
}

export function canRematch(room: RoomState | null, playerId: string | null) {
  return Boolean(room && playerId && room.hostId === playerId);
}

export type RankEntry = GameFinishedPayload["ranking"][number];

export type ResultHeader = { chip: string; stamp: string; early: boolean };

/**
 * Chip dan stempel Hasil Akhir dari kalender game. Selesai normal bila langkah terakhir
 * tercapai (tanggal kalender); lebih awal bila tinggal 1 pemain. Tanpa kalender: tanpa chip.
 */
export function buildResultHeader(
  calendar: Pick<PublicGameState["calendar"], "step" | "totalSteps" | "dateLabel"> | null | undefined,
): ResultHeader {
  if (!calendar) return { chip: "", stamp: "Selesai", early: false };
  const progress = `Langkah ${calendar.step}/${calendar.totalSteps}`;
  if (calendar.step >= calendar.totalSteps) {
    return { chip: `${calendar.dateLabel} | ${progress}`, stamp: "Selesai", early: false };
  }
  return { chip: `Selesai lebih awal | ${progress}`, stamp: "Berakhir", early: true };
}

export type EliminationReasonEntry = { playerId: string; reason: EliminationReason };

/** "Tereliminasi: Bangkrut" / "Tereliminasi: Burnout Total"; tanpa alasan hanya "Tereliminasi". */
export function getEliminatedLabel(reason: EliminationReason | null | undefined): string {
  return reason ? `Tereliminasi: ${ELIMINATION_REASON_LABEL[reason]}` : "Tereliminasi";
}

export type ResultRow = {
  playerId: string;
  rank: number;
  name: string;
  avatarId: RankEntry["avatarId"];
  isSelf: boolean;
  /** Skor Kesejahteraan 0-100 bulat. */
  score: number;
  eliminated: boolean;
  eliminatedLabel: string | null;
  details: {
    netWorth: number;
    points: { finance: number; health: number; calm: number };
    /** Hanya terisi untuk diri sendiri (status pribadi); lawan selalu null. */
    own: { wealth: number; debt: number } | null;
  };
};

/** Data tampilan Hasil Akhir: urut peringkat, skor bulat, rincian lawan tanpa Kekayaan/Hutang. */
export function buildResultRows(input: {
  ranking: RankEntry[];
  reasons: EliminationReasonEntry[];
  selfId: string | null;
  status: PrivateStatus | null;
}): ResultRow[] {
  const { ranking, reasons, selfId, status } = input;
  return [...ranking]
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => {
      const isSelf = entry.playerId === selfId;
      const reason = reasons.find((item) => item.playerId === entry.playerId)?.reason ?? null;
      return {
        playerId: entry.playerId,
        rank: entry.rank,
        name: entry.name,
        avatarId: entry.avatarId,
        isSelf,
        score: formatScore(entry.finalScore),
        eliminated: entry.eliminated,
        eliminatedLabel: entry.eliminated ? getEliminatedLabel(reason) : null,
        details: {
          netWorth: entry.netWorth,
          points: {
            finance: formatScore(entry.points.finance),
            health: formatScore(entry.points.health),
            calm: formatScore(entry.points.calm),
          },
          own: isSelf && status ? { wealth: status.wealth, debt: status.debt } : null,
        },
      };
    });
}

/** Urutan visual podium: peringkat 2, 1, 3. */
export function getPodiumOrder<T>(top: T[]): T[] {
  return [top[1], top[0], top[2]].filter((item): item is T => item !== undefined);
}

/** Teks ringkas untuk Bagikan hasil; hanya data publik game:finished. */
export function buildShareText(rows: ResultRow[]): string {
  const lines = rows.map((row) => `${row.rank}. ${row.name}: ${row.score}/100${row.eliminated ? " (tereliminasi)" : ""}`);
  return ["Hasil Akhir Pejuang UMR: Jakarta Survival", "Skor Kesejahteraan (0-100)", ...lines].join("\n");
}

export type ShareOutcome = "shared" | "copied" | "failed";

export async function shareResultText(
  text: string,
  env: {
    share?: (data: { title: string; text: string }) => Promise<void>;
    clipboard?: Pick<Clipboard, "writeText">;
  },
): Promise<ShareOutcome> {
  if (env.share) {
    try {
      await env.share({ title: "Hasil Akhir Pejuang UMR", text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "failed";
    }
  }
  if (!env.clipboard) return "failed";
  try {
    await env.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export const SHARE_MESSAGE: Record<ShareOutcome, string> = {
  shared: "",
  copied: "Ringkasan hasil disalin.",
  failed: "Gagal membagikan hasil.",
};
