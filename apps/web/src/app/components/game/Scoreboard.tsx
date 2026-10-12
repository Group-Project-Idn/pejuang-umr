"use client";

import type { PublicGameState, RoomState } from "@pejuang/shared";
import Image from "next/image";
import { getAvatarSrc } from "@/lib/avatars";

export default function Scoreboard({
  game,
  room,
  playerId,
}: {
  game: PublicGameState;
  room: RoomState;
  playerId: string;
}) {
  const sorted = [...game.scores].sort(
    (first, second) =>
      first.rank - second.rank ||
      second.provisionalScore - first.provisionalScore,
  );

  return (
    <aside className="paper-panel scoreboard">
      <p className="panel-kicker">Papan skor</p>
      <p className="score-subtitle">Skor sementara</p>
      <ol>
        {sorted.map((score) => {
          const player = room.players.find(
            (candidate) => candidate.playerId === score.playerId,
          );
          return (
            <li
              key={score.playerId}
              className={
                game.activePlayerId === score.playerId ? "active-score" : ""
              }
            >
              <span className="rank">{score.rank}.</span>
              <span className="score-avatar">
                {player ? (
                  <Image src={getAvatarSrc(player.avatarId)} alt={`Karakter ${player.name}`} width={26} height={26} className="size-[26px] object-contain" />
                ) : null}
              </span>
              <span>
                <strong>
                  {player?.name ?? score.playerId}
                  {score.playerId === playerId ? " (Kamu)" : ""}
                </strong>
                <small>{score.provisionalScore} poin</small>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="score-footnote">
        Beban peringkat 1: peluang zonk +15%
      </p>
      {game.gold ? (
        <div className="gold-note">
          <strong>{game.gold.title}</strong>
          <span>Hangus pada langkah {game.gold.expiresAtStep}</span>
        </div>
      ) : null}
    </aside>
  );
}