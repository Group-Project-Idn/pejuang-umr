"use client";

import type { PublicGameState, RoomState, Snapshot } from "@pejuang/shared";
import { useEffect, useMemo, useState } from "react";
import { getTurnSecondsLeft } from "@/lib/game-view";
import GameBoard from "./GameBoard";
import Scoreboard from "./Scoreboard";
import StatusPanel from "./StatusPanel";

const SEASON_LABEL = {
  rainy: "Musim hujan",
  dry: "Musim kemarau",
  transition: "Pancaroba",
} as const;

const SEASON_ICON = {
  rainy: "☂",
  dry: "☀",
  transition: "◐",
} as const;

export default function GameInterface({
  room,
  game,
  me,
  connectionStatus,
  serverClockOffsetMs,
  timerRemainingMs,
}: {
  room: RoomState;
  game: PublicGameState;
  me: Snapshot["me"] | null;
  connectionStatus: string;
  serverClockOffsetMs: number;
  timerRemainingMs: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!game.turnDeadline || game.turnPaused) return;
    const timer = window.setInterval(
      () => setNow(Date.now()),
      250,
    );
    return () => window.clearInterval(timer);
  }, [game.turnDeadline, game.turnPaused]);
  const timeLeft = getTurnSecondsLeft({
    localNow: now,
    serverClockOffsetMs,
    deadline: game.turnDeadline,
    paused: game.turnPaused,
    remainingMs: timerRemainingMs,
  });

  const activePlayer = useMemo(
    () => room.players.find(
      (player) => player.playerId === game.activePlayerId,
    ),
    [game.activePlayerId, room.players],
  );
  const eventMessage = game.openedHexes.at(-1)?.title ??
    "Setiap langkah punya cerita. Tentukan langkahmu berikutnya.";

  return (
    <main className="game-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="game-shell">
        <header className="top-hud">
          <div className="brand-mark">
            <span>S</span>
            <div><strong>Selangkah</strong><small>Strategi menjalani hidup</small></div>
          </div>
          <div className="calendar-card">
            <span className="binder binder-left" />
            <span className="binder binder-right" />
            <strong>{game.calendar.dateLabel}</strong>
            <small>Langkah {game.calendar.step}/{game.calendar.totalSteps}</small>
            <div className="weather">
              {SEASON_ICON[game.calendar.season]}
              <span>{SEASON_LABEL[game.calendar.season]}</span>
            </div>
          </div>
          <div className="mission-card">
            <span>▰</span>
            <div>
              <strong>{game.calendar.nextEvent?.name ?? `Room ${room.code}`}</strong>
              <small>
                {game.calendar.nextEvent
                  ? `${game.calendar.nextEvent.stepsLeft} langkah lagi`
                  : `${connectionStatus} · v${game.version}`}
              </small>
            </div>
          </div>
        </header>
        <div className="game-layout">
          <StatusPanel status={me?.status ?? null} />
          <section className="board-stage">
            {game.gold ? <div className="gold-badge">✦<strong>Petak<br />Emas</strong></div> : null}
            <GameBoard game={game} room={room} />
            <div className="event-toast" role="status">{eventMessage}</div>
          </section>
          <Scoreboard game={game} room={room} playerId={me?.playerId ?? ""} />
        </div>
        <footer className="bottom-hud">
          <div className="turn-display">
            <span className="timer-ring">{game.turnDeadline ? timeLeft : "—"}</span>
            <div>
              <strong>
                {game.turnPaused
                  ? "Dijeda"
                  : activePlayer
                    ? `Giliran ${activePlayer.name}`
                    : "Menunggu giliran"}
              </strong>
              <small>Semua aksi permainan divalidasi server</small>
            </div>
          </div>
          <div className="action-buttons">
            <button type="button" disabled aria-label="Mulai ulang belum tersedia"><span>↻</span><small>Ulang</small></button>
            <button type="button" disabled aria-label="Ekspresi belum tersedia"><span>☺</span><small>Emote</small></button>
            <button type="button" disabled className="invite-button" aria-label="Kartu ajakan belum tersedia"><i>0</i><span>▱</span><small>Kartu ajakan</small></button>
            <button type="button" disabled className="pause-button" aria-label="Jeda belum tersedia"><span>Ⅱ</span><small>Jeda</small></button>
          </div>
        </footer>
      </section>
      <p className="game-tip">Papan isometrik · scroll atau cubit untuk zoom</p>
    </main>
  );
}
