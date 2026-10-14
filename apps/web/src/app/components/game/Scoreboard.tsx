"use client";

import type { PublicGameState, RoomState } from "@pejuang/shared";
import Image from "next/image";
import { getAvatarSrc } from "@/lib/avatars";
import { buildScoreRows } from "@/lib/board-hud";
import Card from "../ui/Card";

export default function Scoreboard({
  game,
  room,
  playerId,
  pickTarget = null,
}: {
  game: PublicGameState;
  room: RoomState;
  playerId: string;
  pickTarget?: { disabledIds: readonly string[]; onSelect: (playerId: string) => void } | null;
}) {
  const rows = buildScoreRows(game.scores, game.activePlayerId);

  return (
    <Card as="aside" className="scoreboard" title="Papan skor">
      <p className="score-subtitle">Skor sementara</p>
      <ol>
        {rows.map((score) => {
          const player = room.players.find(
            (candidate) => candidate.playerId === score.playerId,
          );
          const selectable = pickTarget !== null && !pickTarget.disabledIds.includes(score.playerId) && player !== undefined;
          const content = <>
            <span className="rank type-number">
              {score.isFirst ? <span role="img" aria-label="Peringkat 1">👑</span> : `${score.rank}.`}
            </span>
            <span className="score-avatar">
              {player ? (
                <Image src={getAvatarSrc(player.avatarId)} alt={`Karakter ${player.name}`} width={26} height={26} className="size-[26px] object-contain" />
              ) : null}
            </span>
            <span className="score-info">
              <strong>
                {player?.name ?? score.playerId}
                {score.playerId === playerId ? " (Kamu)" : ""}
              </strong>
              <small>
                {score.scoreText}
                {score.eliminated ? " · ✕ Tereliminasi" : ""}
                {score.isTurn ? " · Jalan" : ""}
              </small>
            </span>
          </>;
          return (
            <li
              key={score.playerId}
              className={
                [score.isTurn ? "active-score" : "", score.eliminated ? "eliminated-score" : "", pickTarget ? selectable ? "invite-score-selectable" : "invite-score-disabled" : ""].join(" ").trim()
              }
              aria-disabled={pickTarget && !selectable ? true : undefined}
            >
              {selectable ? <button type="button" className="invite-score-button" aria-label={`Ajak ${player?.name ?? score.playerId}`} onClick={() => pickTarget?.onSelect(score.playerId)}>
                {content}<span className="invite-score-chip" aria-hidden="true">Ajak</span>
              </button> : content}
            </li>
          );
        })}
      </ol>
      <p className="score-footnote">
        Beban peringkat 1: peluang zonk +15%
      </p>
      {game.gold ? (
        <div className="gold-note ui-note">
          <strong>{game.gold.title}</strong>
          <span>Hangus pada langkah {game.gold.expiresAtStep}</span>
        </div>
      ) : null}
    </Card>
  );
}