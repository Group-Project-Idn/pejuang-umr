"use client";

import { hexKey } from "@pejuang/shared";
import type {
  CalendarEventPayload,
  HexCoord,
  PublicGameState,
  RoomState,
  Snapshot,
} from "@pejuang/shared";
import { useEffect, useMemo, useState } from "react";
import { getTurnSecondsLeft } from "@/lib/game-view";
import CalendarEventView from "../game-v2/CalendarEventView";
import HexDetailSheet from "../game-v2/HexDetailSheet";
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
  actionMessage,
  actionPending,
  onAnswerCalendar,
  onChooseHex,
}: {
  room: RoomState;
  game: PublicGameState;
  me: Snapshot["me"] | null;
  connectionStatus: string;
  serverClockOffsetMs: number;
  timerRemainingMs: number | null;
  actionMessage: string;
  actionPending: boolean;
  onAnswerCalendar: (
    eventId: string,
    choice: CalendarEventPayload["choices"][number]["id"],
  ) => void;
  onChooseHex: (
    turnId: string,
    hex: HexCoord,
    mode: "normal" | "deadEnd",
  ) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedHexKey, setSelectedHexKey] = useState<string | null>(null);
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
    "Papan mengikuti snapshot authoritative dari server.";
  const pendingTurn = me?.pendingTurn ?? null;
  const turnMode = pendingTurn && "stressPenalty" in pendingTurn ? "deadEnd" : "normal";
  const selectedOption = pendingTurn?.options.find(
    (option) => hexKey(option.hex) === selectedHexKey,
  ) ?? null;

  return (
    <main className="game-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="game-shell">
        <header className="top-hud">
          <div className="brand-mark">
            <span>PU</span>
            <div><strong>Pejuang UMR</strong><small>Life strategy game</small></div>
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
            {pendingTurn ? (
              <section className="turn-options" aria-label="Pilihan heksa">
                <strong>
                  {turnMode === "deadEnd"
                    ? "Jalan Buntu · pilih tujuan lompat (+1 Level Stress)"
                    : "Pilih tujuanmu"}
                </strong>
                <div>
                  {pendingTurn.options.map((option) => (
                    <button
                      key={hexKey(option.hex)}
                      type="button"
                      disabled={actionPending}
                      onClick={() => setSelectedHexKey(hexKey(option.hex))}
                      aria-label={`Lihat ${option.title}, heksa ${option.hex.q}, ${option.hex.r}`}
                    >
                      <span>{option.isGold ? "✦" : option.title}</span>
                      <small>{option.hex.q}, {option.hex.r}</small>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
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
      <p className="game-tip">Pilih tujuan lewat tombol heksa · papan dapat diputar dan diperbesar</p>
      {actionMessage ? <p className="game-action-message" role="status">{actionMessage}</p> : null}
      <HexDetailSheet
        option={selectedOption}
        pending={actionPending}
        onChoose={(hex) => {
          if (!pendingTurn) return;
          onChooseHex(pendingTurn.turnId, hex, turnMode);
          setSelectedHexKey(null);
        }}
        onClose={() => setSelectedHexKey(null)}
      />
      <CalendarEventView
        event={me?.pendingCalendar ?? null}
        pending={actionPending}
        onAnswer={onAnswerCalendar}
      />
    </main>
  );
}
