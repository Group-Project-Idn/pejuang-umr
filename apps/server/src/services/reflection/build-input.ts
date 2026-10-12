import { calculateWelfareScore, getDecisionLog, type GameState } from "@pejuang/engine";
import type { ReflectionInput, ReflectionLogEntry } from "./types";

function sanitize(entry: ReturnType<typeof getDecisionLog>[number]): ReflectionLogEntry {
  if (entry.kind === "inviteSent") {
    const { targetId: _targetId, ...rest } = entry;
    return rest;
  }
  if (entry.kind === "inviteResult") {
    const { otherPlayerId: _otherPlayerId, ...rest } = entry;
    return rest;
  }
  return entry;
}

/** Masukan refleksi dari state game: hanya data milik `playerId`. */
export function buildReflectionInput(
  state: GameState,
  playerId: string,
  rank: number | null,
): ReflectionInput | null {
  const player = state.players[playerId];
  if (!player) return null;
  const welfare = calculateWelfareScore(player.status);
  const { wealth, debt, health, stress } = player.status;
  const reason = player.eliminatedReason;
  return {
    playerCount: Object.keys(state.players).length,
    log: getDecisionLog(state, playerId).map(sanitize),
    finalStatus: { wealth, debt, health, stress },
    score: player.frozenScore ?? welfare.score,
    points: welfare.points,
    rank,
    eliminated:
      player.eliminated && player.eliminatedAtStep !== null && reason
        ? { step: player.eliminatedAtStep, reason }
        : null,
  };
}
