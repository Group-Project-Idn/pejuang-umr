"use client";

import type { PawnId, RoomPlayer, RoomState, StartBlockReason } from "@pejuang/shared";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getAvatarSrc } from "@/lib/avatars";

export const ROOM_COPY = {
  title: "RUANG TUNGGU",
  subtitle: "Menunggu peserta rapat",
  rules: "2-4 pemain | 24 langkah | ±30 menit",
  rulesDetail: "1 permainan = 12 bulan. Papan menyesuaikan jumlah pemain.",
  minimumPlayers: "Menunggu minimal 2 pemain",
  waitingReady: "Menunggu pemain siap",
} as const;

export const PAWNS: ReadonlyArray<{ id: PawnId; label: string }> = [
  { id: "cream-circle", label: "Krim · Lingkaran" },
  { id: "iceblue-square", label: "Biru es · Kotak" },
  { id: "mint-triangle", label: "Mint · Segitiga" },
  { id: "salmon-diamond", label: "Salmon · Wajik" },
];

export function getStartHelper(
  canStart: boolean,
  reason: StartBlockReason | null,
): string {
  if (canStart) return "Semua peserta siap. Rapat bisa dimulai.";
  return reason === "NEED_MIN_PLAYERS"
    ? ROOM_COPY.minimumPlayers
    : ROOM_COPY.waitingReady;
}

function PawnMark({ pawn }: { pawn: PawnId | null }) {
  if (!pawn) return null;
  return <span aria-label={PAWNS.find((option) => option.id === pawn)?.label} className={`room-pawn room-pawn-${pawn}`} />;
}

function PlayerSlot({
  player,
  isCurrent,
  canKick,
  disabled,
  onKick,
}: {
  player?: RoomPlayer;
  isCurrent: boolean;
  canKick: boolean;
  disabled: boolean;
  onKick: () => void;
}) {
  if (!player) {
    return (
      <article className="room-player-card room-player-empty">
        <div aria-hidden="true" className="room-empty-avatar" />
        <div>
          <strong>Menunggu</strong>
          <p>pemain...</p>
        </div>
      </article>
    );
  }

  return (
    <article className={`room-player-card ${player.connected ? "" : "room-player-offline"}`}>
      <div className="room-avatar">
        <Image src={getAvatarSrc(player.avatarId)} alt={`Avatar ${player.name}`} fill sizes="180px" className="object-contain object-bottom" />
      </div>
      <div className="min-w-0 room-player-copy">
        <strong>{player.name}{isCurrent ? " · Kamu" : ""}</strong>
        <p className={player.isHost ? "room-role-host" : ""}>
          {player.isHost ? "HOST" : player.ready ? "Siap" : "Belum siap"}
        </p>
        {!player.connected ? <small>Terputus</small> : null}
      </div>
      <PawnMark pawn={player.pawn} />
      {canKick ? (
        <button type="button" onClick={onKick} disabled={disabled} className="room-more-button" aria-label={`Keluarkan ${player.name}`}>×</button>
      ) : null}
    </article>
  );
}

type WaitingRoomProps = {
  room: RoomState | null;
  playerId: string | null;
  connectionStatus: string;
  serverClockOffsetMs: number;
  countdownDeadline: number | null;
  busy: boolean;
  message: string;
  onLeave: () => void;
  onOpenGuide: () => void;
  onCopyCode: () => void;
  onSelectPawn: (pawn: PawnId) => void;
  onReady: () => void;
  onTimer: (seconds: 30 | 60) => void;
  onKick: (targetPlayerId: string) => void;
  onStart: () => void;
};

export function WaitingRoom({
  room,
  playerId,
  connectionStatus,
  serverClockOffsetMs,
  countdownDeadline,
  busy,
  message,
  onLeave,
  onOpenGuide,
  onCopyCode,
  onSelectPawn,
  onReady,
  onTimer,
  onKick,
  onStart,
}: WaitingRoomProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!countdownDeadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [countdownDeadline]);
  const roomPlayer = room?.players.find((player) => player.playerId === playerId);
  const slots = Array.from({ length: 4 }, (_, index) => room?.players[index]);
  const countdownSeconds = countdownDeadline
    ? Math.max(1, Math.ceil((countdownDeadline - (now + serverClockOffsetMs)) / 1_000))
    : null;
  const connected = connectionStatus === "terhubung";

  return (
    <main className="room-office min-h-screen px-3 py-4 text-[#32251f] sm:px-6 sm:py-7">
      <section className="room-browser mx-auto w-full max-w-6xl">
        <div className="room-browser-bar" aria-hidden="true">
          <i className="bg-[#e0614a]" /><i className="bg-[#f5a623]" /><i className="bg-[#3fb871]" />
          <span />
        </div>
        <header className="room-toolbar">
          <button type="button" onClick={onLeave} disabled={busy} className="lobby-comic-btn room-back-button">← Kembali</button>
          <p role="status" className={connected ? "room-server-ok" : "room-server-warn"}>
            Server Jakarta Pusat: <strong>{connected ? "Normal" : connectionStatus}</strong>
          </p>
        </header>

        <div className="room-stage">
          <section className="room-folder" aria-labelledby="waiting-room-title">
            <header className="room-title-row">
              <div>
                <p>{ROOM_COPY.subtitle}</p>
                <h1 id="waiting-room-title">{ROOM_COPY.title}</h1>
              </div>
              <span>Peserta ({room?.players.length ?? 0}/4)</span>
            </header>

            {!room ? (
              <p className="room-loading">Memuat state room...</p>
            ) : (
              <div className="room-content-grid">
                <aside className="room-info-panel">
                  <section>
                    <h2>KODE ROOM</h2>
                    <button type="button" onClick={onCopyCode} className="room-code" aria-label={`Salin kode room ${room.code}`}>{room.code}</button>
                  </section>
                  <section className="room-note">
                    <h2>ATURAN MABAR</h2>
                    <p>{ROOM_COPY.rules}</p>
                    <small>{ROOM_COPY.rulesDetail}</small>
                  </section>
                  <section className="room-note">
                    <h2>TIMER GILIRAN</h2>
                    <div className="room-timer-options">
                      {([30, 60] as const).map((seconds) => (
                        <button key={seconds} type="button" onClick={() => onTimer(seconds)} disabled={busy || !roomPlayer?.isHost} aria-pressed={room.turnSeconds === seconds}>
                          <strong>{seconds} dtk</strong><span>{seconds === 30 ? "Cepat" : "Santai"}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="room-side-actions">
                    <button type="button" onClick={onLeave} disabled={busy} className="lobby-comic-btn bg-[#e8544f]">Keluar</button>
                    <button type="button" onClick={onOpenGuide} className="lobby-comic-btn bg-[#f5bd42]">? &nbsp; Cara Main</button>
                  </div>
                </aside>

                <div className="room-players-panel">
                  <div className="room-player-grid">
                    {slots.map((player, index) => (
                      <PlayerSlot
                        key={player?.playerId ?? `empty-${index}`}
                        player={player}
                        isCurrent={player?.playerId === playerId}
                        canKick={Boolean(roomPlayer?.isHost && player && !player.isHost)}
                        disabled={busy}
                        onKick={() => player && onKick(player.playerId)}
                      />
                    ))}
                  </div>

                  <section className="room-controls">
                    <div className="room-pawn-picker">
                      <h2>Pilih pion</h2>
                      <div>
                        {PAWNS.map((pawn) => {
                          const taken = room.players.some((player) => player.playerId !== playerId && player.pawn === pawn.id);
                          return (
                            <button key={pawn.id} type="button" onClick={() => onSelectPawn(pawn.id)} disabled={busy || taken} aria-pressed={roomPlayer?.pawn === pawn.id} aria-label={`${pawn.label}${taken ? ", sudah dipakai" : ""}`}>
                              <PawnMark pawn={pawn.id} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {roomPlayer?.isHost ? (
                      <div className="room-start-area">
                        <small>{getStartHelper(room.canStart, room.startBlockReason)}</small>
                        <button type="button" onClick={onStart} disabled={busy || !room.canStart} className="lobby-comic-btn room-start-button">
                          {countdownSeconds ? `MULAI (${countdownSeconds})` : "MULAI"}
                        </button>
                      </div>
                    ) : (
                      <div className="room-start-area">
                        <small>{roomPlayer?.pawn ? "Konfirmasi jika kamu sudah siap." : "Pilih pion sebelum siap."}</small>
                        <button type="button" onClick={onReady} disabled={busy || !roomPlayer?.pawn} className="lobby-comic-btn room-ready-button">
                          {roomPlayer?.ready ? "BATAL SIAP" : "SIAP"}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}
            {message ? <p role="status" className="room-message">{message}</p> : null}
          </section>
        </div>
      </section>
      {countdownSeconds ? (
        <div className="room-countdown" role="status" aria-live="assertive">
          <strong>{countdownSeconds}</strong><span>Papan sedang disiapkan...</span>
        </div>
      ) : null}
    </main>
  );
}