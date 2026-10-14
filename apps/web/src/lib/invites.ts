import {
  formatRupiah,
  type ErrorCode,
  type Effect,
  type InviteCard,
  type InviteIncomingPayload,
  type InviteMotive,
  type InvitePlan,
  type InviteResolvedPayload,
  type PublicGameState,
  type RoomState,
  type Snapshot,
} from "@pejuang/shared";
import { getServerNow } from "./game-view";

export const PLAN_LABEL: Record<InvitePlan, string> = {
  hangout: "Ajak Nongkrong",
  morningRun: "Ajak Lari Pagi",
  jointProject: "Ajak Proyek Bareng",
  staycation: "Ajak Staycation Patungan",
};

export const MOTIVE_LABEL: Record<InviteMotive, string> = {
  sincere: "Tulus",
  commission: "Komisi",
};

const STAT_LABEL: Record<Effect["stat"], string> = {
  wealth: "Kekayaan",
  debt: "Hutang",
  health: "Kesehatan",
  stress: "Level Stress",
};

export const INVITE_EXPIRED_NOTICE = "Waktu menjawab habis, dihitung Tolak";
export const INVITE_SENT_NOTICE = "Ajakan terkirim. Menunggu jawaban.";
export const INVITE_FLOW_CANCELLED_NOTICE = "Waktu giliran habis, Ajakan dibatalkan dan kartu tidak terpakai.";

/** Teks UI dari API_CONTRACT Bagian 15. */
const INVITE_ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  INVITE_NOT_ALLOWED: "Ajakan hanya bisa dikirim di giliranmu sebelum memilih heksa.",
  NO_INVITE_CARD: "Kamu belum punya Kartu Ajakan.",
  INVALID_TARGET: "Pemain ini tidak bisa dipilih.",
  INVITE_EXPIRED: "Waktu menjawab habis.",
  GAME_FINISHED: "Permainan sudah selesai.",
  INVALID_PAYLOAD: "Ada yang salah. Coba lagi.",
  INTERNAL: "Server lagi bermasalah. Coba lagi.",
};

export function getInviteErrorMessage(error: ErrorCode): string {
  return INVITE_ERROR_TEXT[error] ?? INVITE_ERROR_TEXT.INTERNAL!;
}

export function formatEffect(effect: Effect): string {
  const sign = effect.delta > 0 ? "+" : effect.delta < 0 ? "-" : "";
  const magnitude = Math.abs(effect.delta);
  const value = effect.stat === "wealth" || effect.stat === "debt"
    ? formatRupiah(magnitude)
    : String(magnitude);
  return `${STAT_LABEL[effect.stat]} ${sign}${value}`;
}

export function formatEffects(effects: readonly Effect[]): string {
  return effects.length === 0 ? "Tanpa efek" : effects.map(formatEffect).join(", ");
}

type Me = NonNullable<Snapshot["me"]>;

/** Kartu Ajakan bisa dimainkan: punya kartu, giliran sendiri, dan belum memilih heksa. */
export function canUseInviteCard(
  me: Me | null,
  game: Pick<PublicGameState, "activePlayerId" | "eliminated">,
): boolean {
  return Boolean(
    me &&
      me.inviteCard &&
      me.pendingTurn &&
      game.activePlayerId === me.playerId &&
      !game.eliminated.includes(me.playerId),
  );
}

/** Ketersediaan kartu di HUD; alur pemilihan yang kedaluwarsa tidak mengunci kartu berikutnya. */
export function getInviteCardAvailability(input: {
  me: Me | null;
  game: PublicGameState;
  room: Pick<RoomState, "players">;
  serverNow: number;
  connected: boolean;
  actionPending: boolean;
  invitePending: boolean;
  hasPopupGrid: boolean;
}): { playable: boolean; reason: string } {
  const { me, game, room, serverNow, connected, actionPending, invitePending, hasPopupGrid } = input;
  if (!me?.inviteCard) return { playable: false, reason: "Belum ada kartu yang bisa dimainkan." };
  if (!connected) return { playable: false, reason: "Menunggu koneksi pulih." };
  if (game.phase !== "turn" || game.activePlayerId !== me.playerId || !me.pendingTurn) {
    return { playable: false, reason: "Bisa dimainkan saat giliranmu sebelum memilih heksa." };
  }
  if (game.eliminated.includes(me.playerId)) return { playable: false, reason: "Pemain tereliminasi tidak bisa mengajak." };
  if (actionPending || invitePending || hasPopupGrid) {
    return { playable: false, reason: "Menunggu respons server atau keputusan awal ronde." };
  }
  if (game.turnDeadline !== null && serverNow >= game.turnDeadline) {
    return { playable: false, reason: "Waktu giliran sudah habis." };
  }
  if (!getSelectableInviteTargetIds(game, room, me.playerId).length) {
    return { playable: false, reason: "Belum ada target yang bisa diajak." };
  }
  return { playable: true, reason: "" };
}

export type InviteFlow =
  | { step: "pick"; turnId: string; cardId: string }
  | { step: "confirm"; turnId: string; cardId: string; targetPlayerId: string };

/**
 * Alur batal bila kartu/giliran hilang, giliran berganti (turnId lain), atau Timer Giliran habis.
 * Mengembalikan alur yang masih sah, selain itu null.
 */
export function resolveInviteFlow(
  flow: InviteFlow | null,
  me: Me | null,
  game: PublicGameState,
  serverNow: number,
  room?: Pick<RoomState, "players">,
  connected = true,
): InviteFlow | null {
  if (!flow || !connected || game.phase !== "turn" || !canUseInviteCard(me, game)) return null;
  if (me!.pendingTurn!.turnId !== flow.turnId) return null;
  if (game.turnDeadline !== null && serverNow >= game.turnDeadline) return null;
  if (me!.inviteCard!.cardId !== flow.cardId) return null;
  if (flow.step === "confirm" && (
    !isInviteTargetSelectable(game, me!.playerId, flow.targetPlayerId) ||
    (room && !getSelectableInviteTargetIds(game, room, me!.playerId).includes(flow.targetPlayerId))
  )) return null;
  return flow;
}

/** Pion nonaktif: diri sendiri, tereliminasi, dan target yang punya popup Ajakan aktif. */
export function isInviteTargetSelectable(
  game: Pick<PublicGameState, "eliminated" | "inviteBusyPlayerIds">,
  myPlayerId: string,
  targetPlayerId: string,
): boolean {
  return (
    targetPlayerId !== myPlayerId &&
    !game.eliminated.includes(targetPlayerId) &&
    !game.inviteBusyPlayerIds.includes(targetPlayerId)
  );
}

export function getDisabledInvitePawnIds(
  game: Pick<PublicGameState, "pawns" | "eliminated" | "inviteBusyPlayerIds">,
  myPlayerId: string,
): string[] {
  return game.pawns
    .map((pawn) => pawn.playerId)
    .filter((playerId) => !isInviteTargetSelectable(game, myPlayerId, playerId));
}

/** Target Ajakan yang ada di room sekaligus di papan, mengikuti aturan seleksi yang sama. */
export function getSelectableInviteTargetIds(
  game: Pick<PublicGameState, "pawns" | "eliminated" | "inviteBusyPlayerIds">,
  room: Pick<RoomState, "players">,
  myPlayerId: string,
): string[] {
  const pawnIds = new Set(game.pawns.map((pawn) => pawn.playerId));
  return room.players
    .map((player) => player.playerId)
    .filter((playerId) => pawnIds.has(playerId) && isInviteTargetSelectable(game, myPlayerId, playerId));
}

export function buildInviteConfirmText(targetName: string, plan: InvitePlan): string {
  return `Ajak ${targetName} untuk ${PLAN_LABEL[plan]}?`;
}

export function buildInviteSendPayload(
  requestId: string,
  me: Me,
  targetPlayerId: string,
) {
  if (!me.pendingTurn || !me.inviteCard) return null;
  return {
    requestId,
    turnId: me.pendingTurn.turnId,
    cardId: me.inviteCard.cardId,
    targetPlayerId,
  };
}

export function getPlayerName(room: Pick<RoomState, "players">, playerId: string): string {
  return room.players.find((player) => player.playerId === playerId)?.name ?? "pemain";
}

export function getInviteSecondsLeft(
  deadline: number,
  localNow: number,
  serverClockOffsetMs: number,
): number {
  return Math.max(0, Math.ceil((deadline - getServerNow(localNow, serverClockOffsetMs)) / 1_000));
}

export type InvitePopupState = {
  invite: InviteIncomingPayload;
  secondsLeft: number;
  /** Target sedang giliran dengan heksa menyala: popup tidak boleh menutupi papan. */
  compact: boolean;
};

/** Popup Ajakan masuk; null bila tidak ada atau waktu menjawab habis (dihitung Tolak). */
export function getInvitePopup(
  me: Me | null,
  localNow: number,
  serverClockOffsetMs: number,
): InvitePopupState | null {
  const invite = me?.pendingInvite;
  if (!me || !invite) return null;
  const secondsLeft = getInviteSecondsLeft(invite.deadline, localNow, serverClockOffsetMs);
  if (secondsLeft <= 0) return null;
  return { invite, secondsLeft, compact: me.pendingTurn !== null };
}

export function isInviteExpired(
  invite: InviteIncomingPayload | null | undefined,
  localNow: number,
  serverClockOffsetMs: number,
): boolean {
  return Boolean(invite && getInviteSecondsLeft(invite.deadline, localNow, serverClockOffsetMs) <= 0);
}

export type InviteResultView = {
  inviteId: string;
  title: string;
  answerText: string;
  motiveText: string;
  effectsText: string;
};

/** Hasil Ajakan untuk pemilik event (pengirim atau target); motif terbuka di sini saja. */
export function buildInviteResultView(
  result: InviteResolvedPayload,
  myPlayerId: string,
  room: Pick<RoomState, "players">,
): InviteResultView | null {
  const isSender = result.fromPlayerId === myPlayerId;
  const isTarget = result.targetPlayerId === myPlayerId;
  if (!isSender && !isTarget) return null;
  const otherName = getPlayerName(room, isSender ? result.targetPlayerId : result.fromPlayerId);
  const answerText = result.answer === "join"
    ? (isTarget ? "Kamu ikut" : `${otherName} ikut`)
    : result.autoDeclined
      ? (isTarget ? "Waktu habis, dihitung Tolak" : `${otherName} tidak menjawab, dihitung Tolak`)
      : (isTarget ? "Kamu menolak" : `${otherName} menolak`);
  return {
    inviteId: result.inviteId,
    title: isTarget ? `Ajakan dari ${otherName}` : `Ajakanmu untuk ${otherName}`,
    answerText,
    motiveText: `Motif: ${MOTIVE_LABEL[result.motive]}`,
    effectsText: formatEffects(result.effectsForYou),
  };
}

export function describeCard(card: InviteCard) {
  return {
    plan: PLAN_LABEL[card.plan],
    effects: formatEffects(card.planEffects),
    motive: MOTIVE_LABEL[card.motive],
  };
}
