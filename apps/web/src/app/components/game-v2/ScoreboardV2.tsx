import type { PawnId, PublicGameState, RoomState } from "@pejuang/shared";
import { PAWN_DETAILS } from "@/data/game";
import Pawn from "./Pawn";

export type ScoreboardV2Props = {
  game: PublicGameState;
  room: RoomState;
  playerId: string;
};

const PAWN_ORDER: PawnId[] = ["cream-circle", "iceblue-square", "mint-triangle", "salmon-diamond"];

/** Baris Papan Skor: peringkat + pion (bentuk) + skor sementara. */
export default function ScoreboardV2({ game, room, playerId }: ScoreboardV2Props) {
  const sorted = [...game.scores].sort(
    (first, second) =>
      first.rank - second.rank || second.provisionalScore - first.provisionalScore,
  );
  return (
    <section aria-label="Papan skor" className="grid gap-2 rounded-md border border-garis bg-kartu p-4">
      <header className="grid gap-0.5">
        <h2 className="text-title text-teks-utama">Papan skor</h2>
        <p className="text-label text-teks-sekunder">Skor sementara</p>
      </header>
      <ol className="grid gap-1.5">
        {sorted.map((score) => {
          const player = room.players.find((candidate) => candidate.playerId === score.playerId);
          const pawn: PawnId = player?.pawn ?? PAWN_ORDER[score.rank % PAWN_ORDER.length] ?? "cream-circle";
          void PAWN_DETAILS[pawn];
          const isActive = game.activePlayerId === score.playerId;
          return (
            <li
              key={score.playerId}
              aria-current={isActive ? "true" : undefined}
              className={`flex items-center gap-2 rounded-sm p-2 ${isActive ? "bg-utama-lembut text-di-utama" : "bg-kartu-tinggi text-teks-utama"}`}
            >
              <span className="pu-numeral w-6 text-body font-bold" aria-label={`Peringkat ${score.rank}`}>
                {score.rank}
              </span>
              <Pawn pawn={pawn} name={player?.name ?? score.playerId} isLeader={score.rank === 1} size={32} />
              <span className="grid min-w-0 flex-1">
                <strong className="truncate text-body-sm">
                  {player?.name ?? score.playerId}
                  {score.playerId === playerId ? " (Kamu)" : ""}
                </strong>
                <small className="pu-numeral text-label opacity-80">{score.provisionalScore} poin</small>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-label text-teks-sekunder">Beban peringkat 1: peluang zonk +15%</p>
    </section>
  );
}
