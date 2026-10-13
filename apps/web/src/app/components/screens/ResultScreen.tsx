import Image from "next/image";
import {
  formatRupiah,
  type GameFinishedPayload,
  type Reflection,
} from "@pejuang/shared";
import { getAvatarSrc } from "@/lib/avatars";
import { formatScore, REMATCH_COPY } from "@/lib/result-screens";
import ReflectionCard from "../game/ReflectionCard";
import Button from "../ui/Button";
import Card from "../ui/Card";

export const RESULT_COPY = {
  title: "Hasil Akhir",
  scoreLabel: "Skor Kesejahteraan",
  eliminated: "Tereliminasi",
  rematch: "Main Lagi",
  leave: "Kembali ke Lobby",
} as const;

type Rank = GameFinishedPayload["ranking"][number];

function Avatar({ rank, size }: { rank: Rank; size: number }) {
  return (
    <Image
      src={getAvatarSrc(rank.avatarId)}
      alt={`Karakter ${rank.name}`}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function Podium({ top }: { top: Rank[] }) {
  // Urutan visual: peringkat 2, 1, 3.
  const ordered = [top[1], top[0], top[2]].filter((r): r is Rank => Boolean(r));
  return (
    <ol className="flex items-end justify-center gap-3" aria-label="Podium">
      {ordered.map((rank) => (
        <li key={rank.playerId} className="grid justify-items-center gap-1 text-center">
          <Avatar rank={rank} size={rank.rank === 1 ? 72 : 56} />
          <span className="text-body-sm font-medium">{rank.name}</span>
          <span className="text-label tabular-nums">
            #{rank.rank} · {formatScore(rank.finalScore)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function RankRow({ rank }: { rank: Rank }) {
  return (
    <li className="ui-note p-3">
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center gap-3">
          <span className="w-6 text-title tabular-nums">{rank.rank}</span>
          <Avatar rank={rank} size={40} />
          <span className="grid flex-1">
            <span className="font-medium">{rank.name}</span>
            {rank.eliminated ? (
              <span className="text-label text-bahaya">
                {RESULT_COPY.eliminated}
                {rank.eliminatedAtStep ? ` · Langkah ${rank.eliminatedAtStep}` : ""}
              </span>
            ) : null}
          </span>
          <span className="text-right">
            <span className="block text-title tabular-nums">{formatScore(rank.finalScore)}</span>
            <span className="block text-label text-teks-redup">{RESULT_COPY.scoreLabel}</span>
          </span>
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-body-sm">
          <dt>Harta Bersih</dt><dd className="text-right">{formatRupiah(rank.netWorth)}</dd>
          <dt>Poin Keuangan</dt><dd className="text-right tabular-nums">{formatScore(rank.points.finance)}</dd>
          <dt>Poin Kesehatan</dt><dd className="text-right tabular-nums">{formatScore(rank.points.health)}</dd>
          <dt>Poin Ketenangan</dt><dd className="text-right tabular-nums">{formatScore(rank.points.calm)}</dd>
        </dl>
      </details>
    </li>
  );
}

export default function ResultScreen({
  result,
  reflection,
  isHost,
  busy,
  message,
  onRematch,
  onLeave,
}: {
  result: GameFinishedPayload | null;
  reflection: Reflection | null | undefined;
  isHost: boolean;
  busy: boolean;
  message: string;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const ranking = result ? [...result.ranking].sort((a, b) => a.rank - b.rank) : [];
  return (
    <div className="lobby-desk min-h-dvh text-[#fbe6b1]">
    <main className="mx-auto grid w-full max-w-md gap-4 px-4 py-6">
      <h1 className="text-headline">{RESULT_COPY.title}</h1>
      {result ? (
        <>
          <Podium top={ranking.slice(0, 3)} />
          <ol className="grid gap-2" aria-label="Peringkat">
            {ranking.map((rank) => <RankRow key={rank.playerId} rank={rank} />)}
          </ol>
        </>
      ) : (
        <Card><p role="status" className="text-body-sm">Menyusun hasil akhir...</p></Card>
      )}
      <ReflectionCard reflection={reflection} />
      {message ? <p role="status" className="text-body-sm">{message}</p> : null}
      <div className="grid gap-2">
        {isHost ? (
          <Button onClick={onRematch} disabled={busy}>{RESULT_COPY.rematch}</Button>
        ) : (
          <p role="status" className="text-center text-body-sm">
            {REMATCH_COPY.waitingHost}
          </p>
        )}
        <Button variant="secondary" onClick={onLeave} disabled={busy}>{RESULT_COPY.leave}</Button>
      </div>
    </main>
    </div>
  );
}
