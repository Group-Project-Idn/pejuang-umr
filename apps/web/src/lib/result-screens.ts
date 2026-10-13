import type {
  Ack,
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

export type EliminationReason = "bankrupt" | "burnout";

/** Alasan diturunkan dari status privat terakhir (snapshot tidak membawa alasan). */
export function getEliminationReason(
  status: PrivateStatus | null,
): EliminationReason | null {
  if (!status) return null;
  return status.debt > status.debtLimit ? "bankrupt" : "burnout";
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
