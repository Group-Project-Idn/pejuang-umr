"use client";

import Image from "next/image";
import { useState } from "react";
import { formatRupiah, type GameFinishedPayload, type PublicGameState, type PrivateStatus, type Reflection } from "@pejuang/shared";
import { getAvatarSrc } from "@/lib/avatars";
import { useSfxOnMount } from "@/lib/use-sfx";
import {
  buildResultHeader,
  buildResultRows,
  buildShareText,
  getPodiumOrder,
  REMATCH_COPY,
  SHARE_MESSAGE,
  shareResultText,
  type EliminationReasonEntry,
  type ResultRow,
} from "@/lib/result-screens";
import ReflectionCard from "../game/ReflectionCard";
import Button from "../ui/Button";

export const RESULT_COPY = {
  title: "Hasil Akhir",
  subtitle: "Evaluasi kinerja 12 bulan",
  ranking: "Peringkat",
  scoreLabel: "Skor Kesejahteraan",
  detail: "Lihat rincian",
  rematch: "Main Lagi",
  leave: "Kembali ke Lobby",
  share: "Bagikan hasil",
} as const;

function Avatar({ row, size }: { row: ResultRow; size: number }) {
  return (
    <Image
      src={getAvatarSrc(row.avatarId)}
      alt={`Karakter ${row.name}`}
      width={size}
      height={size}
      className={`object-contain ${row.eliminated ? "grayscale" : ""}`}
      style={{ width: size, height: size }}
    />
  );
}

function Podium({ top }: { top: ResultRow[] }) {
  return (
    <ol className="flex items-end justify-center gap-2 sm:gap-4" aria-label="Podium">
      {getPodiumOrder(top).map((row) => (
        <li
          key={row.playerId}
          className={`ui-note grid w-28 justify-items-center gap-1 p-2 text-center sm:w-32 ${row.eliminated ? "opacity-70 grayscale" : ""}`}
          style={{ paddingTop: row.rank === 1 ? 20 : 8 }}
        >
          <Avatar row={row} size={row.rank === 1 ? 72 : 56} />
          <span className="text-body-sm font-bold">
            {row.name}
            {row.isSelf ? " (Kamu)" : ""}
          </span>
          <span className="type-number text-title">{row.score}</span>
          <span className="type-number text-label">#{row.rank}</span>
          {row.eliminatedLabel ? <span className="text-label font-bold">{row.eliminatedLabel}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function RankRow({ row }: { row: ResultRow }) {
  const { details } = row;
  return (
    <li className={`ui-note p-3 ${row.eliminated ? "opacity-75 grayscale" : ""}`}>
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center gap-3">
          <span className="type-number w-6 text-title">{row.rank}</span>
          <Avatar row={row} size={40} />
          <span className="grid min-w-0 flex-1">
            <span className="truncate font-bold">
              {row.name}
              {row.isSelf ? " (Kamu)" : ""}
            </span>
            {row.eliminatedLabel ? <span className="text-label font-bold">{row.eliminatedLabel}</span> : null}
            <span className="text-label underline">{RESULT_COPY.detail}</span>
          </span>
          <span className="text-right">
            <span className="type-number block text-title">{row.score}</span>
            <span className="block text-label">{RESULT_COPY.scoreLabel}</span>
          </span>
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-body-sm">
          {details.own ? (
            <>
              <dt>Kekayaan</dt><dd className="text-right">{formatRupiah(details.own.wealth)}</dd>
              <dt>Hutang</dt><dd className="text-right">{formatRupiah(details.own.debt)}</dd>
            </>
          ) : null}
          <dt>Harta Bersih</dt><dd className="text-right">{formatRupiah(details.netWorth)}</dd>
          <dt>Poin Keuangan</dt><dd className="text-right tabular-nums">{details.points.finance}</dd>
          <dt>Poin Kesehatan</dt><dd className="text-right tabular-nums">{details.points.health}</dd>
          <dt>Poin Ketenangan</dt><dd className="text-right tabular-nums">{details.points.calm}</dd>
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
  selfId = null,
  status = null,
  reasons = [],
  calendar = null,
  onRematch,
  onLeave,
}: {
  result: GameFinishedPayload | null;
  reflection: Reflection | null | undefined;
  isHost: boolean;
  busy: boolean;
  message: string;
  /** Pemain sendiri; Kekayaan dan Hutang hanya dibuka untuknya. */
  selfId?: string | null;
  status?: PrivateStatus | null;
  reasons?: EliminationReasonEntry[];
  /** game.calendar; sumber chip langkah/tanggal dan stempel. */
  calendar?: PublicGameState["calendar"] | null;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const [shareMessage, setShareMessage] = useState("");
  useSfxOnMount("finish");
  const rows = result ? buildResultRows({ ranking: result.ranking, reasons, selfId, status }) : [];
  const header = buildResultHeader(calendar);

  const share = async () => {
    const outcome = await shareResultText(buildShareText(rows), {
      share: typeof navigator !== "undefined" && navigator.share ? navigator.share.bind(navigator) : undefined,
      clipboard: typeof navigator !== "undefined" ? navigator.clipboard : undefined,
    });
    setShareMessage(SHARE_MESSAGE[outcome]);
  };

  return (
    <div className="lobby-desk min-h-dvh px-3 py-6 sm:px-6">
      <main className="room-folder mx-auto grid w-full max-w-5xl content-start gap-5 text-[color:var(--ink-text)]" style={{ minHeight: 0 }}>
        <header className="flex flex-wrap items-center gap-3">
          {header.chip ? <span className="ui-note px-3 py-1 text-body-sm font-bold">{header.chip}</span> : null}
          <div className="grid">
            <h1 className="font-heading text-headline font-bold uppercase">{RESULT_COPY.title}</h1>
            <p className="text-body-sm">{RESULT_COPY.subtitle}</p>
          </div>
          <span className="ui-stamp text-title">{header.stamp}</span>
        </header>

        {result ? (
          <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
            <div className="grid content-start gap-5">
              <Podium top={rows.slice(0, 3)} />
              <ReflectionCard reflection={reflection} />
            </div>
            <section aria-labelledby="ranking-title" className="ui-note grid content-start gap-2 p-3">
              <h2 id="ranking-title" className="font-heading text-title font-bold uppercase">{RESULT_COPY.ranking}</h2>
              <p className="text-label">{RESULT_COPY.scoreLabel} (0-100)</p>
              <ol className="grid gap-2" aria-label="Peringkat">
                {rows.map((row) => <RankRow key={row.playerId} row={row} />)}
              </ol>
            </section>
          </div>
        ) : (
          <p role="status" className="ui-note p-3 text-body-sm">Menyusun hasil akhir...</p>
        )}

        {message || shareMessage ? <p role="status" className="text-body-sm">{message || shareMessage}</p> : null}
        <div className="grid gap-2 sm:grid-cols-3">
          {isHost ? (
            <Button onClick={onRematch} disabled={busy}>{RESULT_COPY.rematch}</Button>
          ) : (
            <div className="grid gap-1 text-center">
              <Button disabled>{RESULT_COPY.rematch}</Button>
              <p role="status" className="text-label">{REMATCH_COPY.waitingHost}</p>
            </div>
          )}
          <Button variant="secondary" onClick={onLeave} disabled={busy}>{RESULT_COPY.leave}</Button>
          <Button variant="outlined" onClick={share} disabled={!result}>{RESULT_COPY.share}</Button>
        </div>
      </main>
    </div>
  );
}
