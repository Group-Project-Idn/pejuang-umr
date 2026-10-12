"use client";

import type { Ack, RoomPlayer, RoomState, StartBlockReason } from "@pejuang/shared";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AVATAR_OPTIONS, getAvatarSrc } from "@/lib/avatars";

export const ROOM_COPY = {
  title: "RUANG TUNGGU",
  subtitle: "Menunggu peserta rapat",
  rules: "2-4 pemain | 24 langkah | ±30 menit",
  rulesDetail: "1 permainan = 12 bulan. Papan menyesuaikan jumlah pemain.",
  minimumPlayers: "Menunggu minimal 2 pemain",
  waitingReady: "Menunggu pemain siap",
} as const;

export const AVATAR_TAKEN_MESSAGE = "Karakter ini sudah dipilih pemain lain.";

/** Karakter yang dipakai pemain lain nonaktif; karakter sendiri tetap bisa dipilih. */
export function getAvatarChoices(
  players: readonly Pick<RoomPlayer, "playerId" | "avatarId">[],
  playerId: string | null,
) {
  return AVATAR_OPTIONS.map((option) => ({
    ...option,
    taken: players.some(
      (player) => player.playerId !== playerId && player.avatarId === option.id,
    ),
    selected: players.some(
      (player) => player.playerId === playerId && player.avatarId === option.id,
    ),
  }));
}

export function getRoomActionMessage(action: string, response: Ack): string {
  if (response.ok) return `${action} berhasil.`;
  if (response.error === "AVATAR_TAKEN") return AVATAR_TAKEN_MESSAGE;
  return `Gagal: ${response.error}`;
}

export function getStartHelper(
  canStart: boolean,
  reason: StartBlockReason | null,
): string {
  if (canStart) return "Semua peserta siap. Rapat bisa dimulai.";
  return reason === "NEED_MIN_PLAYERS"
    ? ROOM_COPY.minimumPlayers
    : ROOM_COPY.waitingReady;
}

export function getParticipantLabel(playerCount: number): string {
  return `PESERTA (${playerCount}/4)`;
}

export function getCountdownSeconds(
  deadline: number | null,
  serverNow: number,
): number | null {
  if (!deadline || serverNow >= deadline) return null;
  return Math.ceil((deadline - serverNow) / 1_000);
}

export function getCountdownPresentation(
  roomStatus: RoomState["status"] | undefined,
  deadline: number | null,
  serverNow: number,
): { seconds: number | null; preparing: boolean } {
  const seconds = getCountdownSeconds(deadline, serverNow);
  return {
    seconds,
    preparing: roomStatus === "countdown" && seconds === null,
  };
}

function CountdownProgress({
  deadline,
  serverClockOffsetMs,
  connected,
}: {
  deadline: number;
  serverClockOffsetMs: number;
  connected: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow + serverClockOffsetMs >= deadline) {
        window.clearInterval(timer);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [deadline, serverClockOffsetMs]);
  const countdown = getCountdownPresentation(
    "countdown",
    deadline,
    now + serverClockOffsetMs,
  );

  if (countdown.preparing) {
    return (
      <p role="status" className="room-message">
        {connected
          ? "Papan sedang disiapkan oleh server..."
          : "Koneksi terputus saat menyiapkan papan. Mencoba terhubung kembali..."}
      </p>
    );
  }

  return countdown.seconds ? (
    <div className="room-countdown" role="status" aria-live="assertive">
      <strong>{countdown.seconds}</strong><span>Papan sedang disiapkan...</span>
    </div>
  ) : null;
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
  onSelectAvatar: (avatarId: string) => void;
  onReady: () => void;
  onTimer: (seconds: 15 | 30 | 60) => void;
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
  onSelectAvatar,
  onReady,
  onTimer,
  onKick,
  onStart,
}: WaitingRoomProps) {
  const roomPlayer = room?.players.find((player) => player.playerId === playerId);
  const slots = Array.from({ length: 4 }, (_, index) => room?.players[index]);
  const connected = connectionStatus === "terhubung";
  const preparingWithoutDeadline = room?.status === "countdown" && !countdownDeadline;

  return (
    <main className="room-office min-h-screen px-3 py-4 text-[#32251f] sm:px-6 sm:py-7">
      <section className="room-browser mx-auto w-full max-w-[1440px]">
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
            <h1 id="waiting-room-title" className="sr-only">{ROOM_COPY.title}: {ROOM_COPY.subtitle}</h1>

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
                      {([15, 30, 60] as const).map((seconds) => (
                        <button key={seconds} type="button" onClick={() => onTimer(seconds)} disabled={busy || !roomPlayer?.isHost} aria-pressed={room.turnSeconds === seconds}>
                          <strong>{seconds} dtk</strong><span>{seconds === 15 ? "Kilat" : seconds === 30 ? "Cepat" : "Santai"}</span>
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
                    <div className="room-avatar-picker">
                      <h2>Pilih karakter</h2>
                      <div>
                        {getAvatarChoices(room.players, playerId).map((avatar) => (
                          <button key={avatar.id} type="button" onClick={() => onSelectAvatar(avatar.id)} disabled={busy || avatar.taken} aria-pressed={avatar.selected} aria-label={`${avatar.name}${avatar.taken ? ", sudah dipakai" : ""}`}>
                            <Image src={avatar.src} alt="" width={40} height={40} className="size-10 object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                    {roomPlayer?.isHost ? (
                      <div className="room-start-area">
                        <strong className="room-participant-count">{getParticipantLabel(room.players.length)}</strong>
                        <small>{getStartHelper(room.canStart, room.startBlockReason)}</small>
                        <button type="button" onClick={onStart} disabled={busy || !room.canStart} className="lobby-comic-btn room-start-button">
                          {room.status === "countdown" ? "MEMULAI..." : "MULAI"}
                        </button>
                      </div>
                    ) : (
                      <div className="room-start-area">
                        <strong className="room-participant-count">{getParticipantLabel(room.players.length)}</strong>
                        <small>Konfirmasi jika kamu sudah siap.</small>
                        <button type="button" onClick={onReady} disabled={busy} className="lobby-comic-btn room-ready-button">
                          {roomPlayer?.ready ? "BATAL SIAP" : "SIAP"}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}
            {preparingWithoutDeadline ? (
              <p role="status" className="room-message">
                {connected
                  ? "Papan sedang disiapkan oleh server..."
                  : "Koneksi terputus saat menyiapkan papan. Mencoba terhubung kembali..."}
              </p>
            ) : null}
            {message ? <p role="status" className="room-message">{message}</p> : null}
          </section>
        </div>
      </section>
      {countdownDeadline ? (
        <CountdownProgress
          key={countdownDeadline}
          deadline={countdownDeadline}
          serverClockOffsetMs={serverClockOffsetMs}
          connected={connected}
        />
      ) : null}
    </main>
  );
}