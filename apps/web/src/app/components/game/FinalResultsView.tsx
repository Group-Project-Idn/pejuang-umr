"use client";

import type { Reflection, RoomState, Snapshot } from "@pejuang/shared";
import { formatRupiah } from "@pejuang/shared";
import Image from "next/image";
import { useState } from "react";
import { getAvatarName, getAvatarSrc } from "@/lib/avatars";
import Button from "../ui/Button";
import { createResultsImage } from "./results-image";

type GameResult = NonNullable<Snapshot["result"]>;

export default function FinalResultsView({
  result,
  reflection,
  room,
  playerId,
  dateLabel,
  step,
  pending,
  message,
  onRematch,
  onLeave,
  onMessage,
}: {
  result: GameResult;
  reflection: Reflection | null;
  room: RoomState;
  playerId: string;
  dateLabel: string;
  step: number;
  pending: boolean;
  message: string;
  onRematch: () => void;
  onLeave: () => void;
  onMessage: (message: string) => void;
}) {
  const [showReflection, setShowReflection] = useState(false);
  const ranking = [...result.ranking].sort(
    (first, second) => first.rank - second.rank,
  );
  const podium = ranking.filter((entry) => entry.rank <= 3);
  const host = room.hostId === playerId;

  async function shareResults() {
    try {
      const image = await createResultsImage(result);
      const file = new File([image], "hasil-pejuang-umr.png", { type: "image/png" });
      const shareText = `Hasil akhir Pejuang UMR · ${dateLabel}`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Hasil Akhir Pejuang UMR", text: shareText });
        onMessage("Hasil berhasil dibagikan.");
        return;
      }

      const url = URL.createObjectURL(image);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      onMessage("Gambar hasil akhir diunduh.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      onMessage("Gambar hasil tidak dapat dibuat. Coba lagi.");
    }
  }

  return (
    <main className="final-results-page">
      <section className="final-results-office" aria-labelledby="final-results-title">
        <div className="final-results-ceiling" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="final-results-folder">
          <header className="final-results-heading">
            <div>
              <p className="final-results-date">{dateLabel} | Langkah {step}/24</p>
              <h1 id="final-results-title">Hasil Akhir</h1>
              <p className="final-results-subtitle">Evaluasi kinerja 12 bulan</p>
            </div>
            <span className="final-results-stamp">SELESAI</span>
          </header>

          <div className="final-results-content">
            <section className="final-podium" aria-label="Podium pemain">
              {podium.map((entry) => (
                <article
                  className={`final-podium-card final-podium-rank-${entry.rank}`}
                  key={entry.playerId}
                >
                  <span className="final-podium-medal" aria-label={`Peringkat ${entry.rank}`}>
                    {entry.rank === 1 ? "♛" : `${entry.rank}`}
                  </span>
                  <Image
                    src={getAvatarSrc(entry.avatarId)}
                    alt={`Karakter ${getAvatarName(entry.avatarId)}`}
                    width={64}
                    height={64}
                    className="final-podium-avatar"
                  />
                  <strong>{entry.name}</strong>
                  <span className="final-podium-score">{Math.round(entry.finalScore)} poin</span>
                  <span className="final-podium-net-worth">{formatRupiah(entry.netWorth)}</span>
                </article>
              ))}
              {ranking.slice(3).map((entry) => (
                <article className="final-eliminated-card" key={entry.playerId}>
                  <Image
                    src={getAvatarSrc(entry.avatarId)}
                    alt=""
                    width={36}
                    height={36}
                    className="final-eliminated-avatar"
                  />
                  <span>
                    <strong>{entry.name}</strong>
                    <small>
                      {entry.eliminatedAtStep
                        ? `Tereliminasi · Langkah ${entry.eliminatedAtStep}`
                        : "Peringkat berikutnya"}
                    </small>
                  </span>
                  <b>{Math.round(entry.finalScore)}</b>
                </article>
              ))}
              <div className="final-insight-area">
                <Button
                  type="button"
                  variant="secondary"
                  className="final-insight-button"
                  aria-expanded={showReflection}
                  aria-controls="final-reflection"
                  onClick={() => setShowReflection((visible) => !visible)}
                >
                  ✦ {showReflection ? "Tutup Insight" : "Lihat Insight"}
                </Button>
                <p>Refleksi pribadi</p>
              </div>
            </section>

            <section className="final-ranking" aria-labelledby="final-ranking-title">
              <h2 id="final-ranking-title">Peringkat</h2>
              <p className="final-ranking-caption">Skor Kesejahteraan</p>
              <ol>
                {ranking.map((entry) => (
                  <li key={entry.playerId}>
                    <span className="final-ranking-rank">{entry.rank}</span>
                    <Image
                      src={getAvatarSrc(entry.avatarId)}
                      alt=""
                      width={34}
                      height={34}
                      className="final-ranking-avatar"
                    />
                    <div className="final-ranking-player">
                      <strong>{entry.name}{entry.playerId === playerId ? " (Kamu)" : ""}</strong>
                      <span>{Math.round(entry.finalScore)} poin · {formatRupiah(entry.netWorth)}</span>
                    </div>
                    <details className="final-score-details">
                      <summary aria-label={`Rincian skor ${entry.name}`}>Rincian</summary>
                      <dl>
                        <div><dt>Keuangan</dt><dd>{Math.round(entry.points.finance)}</dd></div>
                        <div><dt>Kesehatan</dt><dd>{Math.round(entry.points.health)}</dd></div>
                        <div><dt>Ketenangan</dt><dd>{Math.round(entry.points.calm)}</dd></div>
                      </dl>
                    </details>
                  </li>
                ))}
              </ol>
              <p className="final-ranking-footnote">
                Harta Bersih dan tiga poin skor ditampilkan sesuai hasil permainan.
              </p>
            </section>
          </div>

          {showReflection ? (
            <section id="final-reflection" className="final-reflection" aria-live="polite">
              <h2>Insight untukmu</h2>
              {reflection ? (
                <>
                  <p>{reflection.summary}</p>
                  {reflection.insights.length > 0 ? (
                    <ul>
                      {reflection.insights.map((insight, index) => (
                        <li key={`${insight.title}-${index}`}>
                          <strong>{insight.title}</strong>
                          <span>{insight.body}</span>
                          {insight.reference ? <small>{insight.reference}</small> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <small>{reflection.source === "ai" ? "Refleksi AI" : "Insight berbasis aturan"}</small>
                </>
              ) : (
                <p role="status">Refleksi sedang disiapkan. Bagian ini akan diperbarui otomatis.</p>
              )}
            </section>
          ) : null}

          <footer className="final-results-actions">
            <div className="final-results-feedback" role="status" aria-live="polite">{message}</div>
            {host ? (
              <Button type="button" className="final-rematch-button" disabled={pending} onClick={onRematch}>
                ↻ Main Lagi
              </Button>
            ) : (
              <p className="final-host-note">Menunggu host memulai Main Lagi</p>
            )}
            <Button type="button" variant="outlined" disabled={pending} onClick={onLeave}>
              ← Kembali ke Lobby
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => void shareResults()}>
              ↗ Bagikan hasil
            </Button>
          </footer>
        </div>
      </section>
    </main>
  );
}
