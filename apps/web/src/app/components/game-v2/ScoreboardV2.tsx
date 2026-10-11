import type { PublicGameState, RoomState } from "@pejuang/shared";
import Card from "../ui/Card";
import Chip from "../ui/Chip";

export type ScoreboardV2Props = {
  game: PublicGameState;
  room: RoomState;
  playerId: string;
};

/** Papan skor v2: baris skor + beban Peringkat 1 + info Petak Emas. */
export default function ScoreboardV2({ game, room, playerId }: ScoreboardV2Props) {
  const sorted = [...game.scores].sort(
    (first, second) =>
      first.rank - second.rank || second.provisionalScore - first.provisionalScore,
  );
  return (
    <Card title="Papan skor">
      <p className="text-label text-teks-sekunder">Skor sementara</p>
      <ol className="mt-2 grid gap-2">
        {sorted.map((score) => {
          const player = room.players.find(
            (candidate) => candidate.playerId === score.playerId,
          );
          const burdened = game.rankOneBurden.includes(score.playerId);
          return (
            <li
              key={score.playerId}
              className={`flex items-center gap-2 rounded-sm border px-3 py-2 ${
                game.activePlayerId === score.playerId
                  ? "border-indikator-kekayaan bg-kartu-tinggi"
                  : "border-garis bg-kartu"
              }`}
            >
              <span className="text-body tabular-nums text-teks-utama">{score.rank}.</span>
              <span aria-hidden="true" className="text-body">♟</span>
              <span className="grid flex-1">
                <strong className="text-body-sm text-teks-utama">
                  {player?.name ?? score.playerId}
                  {score.playerId === playerId ? " (kamu)" : ""}
                </strong>
                <small className="text-label tabular-nums text-teks-sekunder">
                  {score.provisionalScore} poin
                </small>
              </span>
              {burdened ? <Chip><span aria-hidden="true">▲</span> Beban +15%</Chip> : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-label text-teks-sekunder">
        Beban peringkat 1: peluang zonk +15%
      </p>
      {game.gold ? (
        <p className="mt-2 text-body-sm text-teks-utama">
          <strong>{game.gold.title}</strong> · hangus langkah {game.gold.expiresAtStep}
        </p>
      ) : null}
    </Card>
  );
}
