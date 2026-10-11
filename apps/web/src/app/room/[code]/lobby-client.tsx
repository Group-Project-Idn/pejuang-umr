"use client";

import type {
  Ack,
  PawnId,
  PrivateStatus,
  PublicGameState,
  RoomState,
  Snapshot,
} from "@pejuang/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import GameInterface from "@/app/components/game/GameInterface";
import { readGuestSession } from "@/lib/guest-session";
import {
  acceptSnapshot,
  applyGamePatch,
  applyRealtimeTurnTimer,
  type GamePatch,
  type TurnTimer,
} from "@/lib/game-view";
import { createRequestId } from "@/lib/request-id";
import { clearRoomCode, writeRoomCode } from "@/lib/room-session";
import { getSocket, type GameSocket } from "@/lib/socket";

const PAWNS: Array<{ id: PawnId; label: string }> = [
  { id: "cream-circle", label: "Krim · Lingkaran" },
  { id: "iceblue-square", label: "Biru es · Kotak" },
  { id: "mint-triangle", label: "Mint · Segitiga" },
  { id: "salmon-diamond", label: "Salmon · Berlian" },
];

export function LobbyClient({ code }: { code: string }) {
  const router = useRouter();
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [gameView, setGameView] = useState<{
    game: PublicGameState | null;
    timerRemainingMs: number | null;
  }>({ game: null, timerRemainingMs: null });
  const [privateMe, setPrivateMe] = useState<Snapshot["me"] | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [status, setStatus] = useState("menghubungkan...");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
  const game = gameView.game;

  useEffect(() => {
    const session = readGuestSession();
    if (!session) {
      router.replace("/lobby");
      return;
    }
    queueMicrotask(() => setPlayerId(session.playerId));
    writeRoomCode(code);
    const gameSocket = getSocket(session.token);
    queueMicrotask(() => setSocket(gameSocket));
    const resume = () => {
      setStatus("memulihkan room...");
      gameSocket.timeout(3_000).emit(
        "session:resume",
        { requestId: createRequestId(), roomCode: code },
        (error, response) => {
          if (error) {
            setStatus("gagal terhubung");
            setMessage("Server tidak merespons saat memulihkan room.");
            return;
          }
          if (!response.ok) {
            clearRoomCode();
            setMessage(`Gagal: ${response.error}`);
            router.replace("/lobby");
            return;
          }
          setRoom(response.snapshot.room);
          setPrivateMe(response.snapshot.me);
          setServerClockOffsetMs(response.snapshot.serverTime - Date.now());
          setGameView((currentView) => {
            const currentGame = currentView.game;
            if (
              currentGame &&
              response.snapshot.game &&
              currentGame.version > response.snapshot.game.version
            ) {
              return { ...currentView, timerRemainingMs: null };
            }
            return {
              game: response.snapshot.game,
              timerRemainingMs: null,
            };
          });
          setStatus("terhubung");
        },
      );
    };
    const onRoomState = (nextRoom: RoomState) => setRoom(nextRoom);
    const onDisconnect = () => setStatus("terputus · mencoba kembali");
    const onCountdown = ({ deadline }: { deadline: number; seconds: 3 }) => {
      setCountdown(deadline);
    };
    const onSnapshot = (snapshot: Snapshot) => {
      setRoom(snapshot.room);
      setPrivateMe(snapshot.me);
      setServerClockOffsetMs(snapshot.serverTime - Date.now());
      setGameView((currentView) => {
        const currentGame = currentView.game;
        const current = currentGame
          ? { ...snapshot, game: currentGame }
          : null;
        return {
          game: acceptSnapshot(current, snapshot).game,
          timerRemainingMs: null,
        };
      });
      setCountdown(null);
    };
    const onGamePatch = (patch: GamePatch) => {
      setGameView((currentView) => ({
        ...currentView,
        game: applyGamePatch(currentView.game, patch),
      }));
    };
    const onPlayerStatus = (nextStatus: PrivateStatus) => {
      setPrivateMe((currentMe) =>
        currentMe ? { ...currentMe, status: nextStatus } : currentMe,
      );
    };
    const onTurnTimer = (timer: TurnTimer) => {
      setGameView((currentView) =>
        applyRealtimeTurnTimer(currentView, timer),
      );
    };
    const onKicked = () => {
      clearRoomCode();
      router.replace("/lobby");
    };
    gameSocket.on("connect", resume);
    gameSocket.on("room:state", onRoomState);
    gameSocket.on("disconnect", onDisconnect);
    gameSocket.on("room:countdown", onCountdown);
    gameSocket.on("session:snapshot", onSnapshot);
    gameSocket.on("game:patch", onGamePatch);
    gameSocket.on("player:status", onPlayerStatus);
    gameSocket.on("turn:timer", onTurnTimer);
    gameSocket.on("room:kicked", onKicked);
    if (gameSocket.connected) resume();
    else gameSocket.connect();
    return () => {
      gameSocket.off("connect", resume);
      gameSocket.off("room:state", onRoomState);
      gameSocket.off("disconnect", onDisconnect);
      gameSocket.off("room:countdown", onCountdown);
      gameSocket.off("session:snapshot", onSnapshot);
      gameSocket.off("game:patch", onGamePatch);
      gameSocket.off("player:status", onPlayerStatus);
      gameSocket.off("turn:timer", onTurnTimer);
      gameSocket.off("room:kicked", onKicked);
    };
  }, [code, router]);

  const handleResponse = useCallback((action: string, response: Ack) => {
    setPending(null);
    setMessage(response.ok ? `${action} berhasil.` : `Gagal: ${response.error}`);
  }, []);

  function leaveRoom() {
    if (!socket) return;
    setPending("leave");
    socket.timeout(3_000).emit(
      "room:leave",
      { requestId: createRequestId() },
      (error, response) => {
        if (error) return handleResponse("Keluar room", { ok: false, error: "INTERNAL" });
        if (response.ok) {
          clearRoomCode();
          router.replace("/lobby");
        }
        handleResponse("Keluar room", response);
      },
    );
  }

  const roomPlayer = room?.players.find(
    (player) => player.playerId === playerId,
  );
  const busy = pending !== null;

  if (room?.status === "playing" && game) {
    return (
      <GameInterface
        room={room}
        game={game}
        me={privateMe}
        connectionStatus={status}
        serverClockOffsetMs={serverClockOffsetMs}
        timerRemainingMs={gameView.timerRemainingMs}
      />
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 px-6 py-10 text-stone-100">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-400">Lobby room</p>
            <h1 className="mt-2 text-4xl font-bold">{code}</h1>
            <p className="mt-2 text-stone-400">Status koneksi: {status}</p>
          </div>
          <button type="button" onClick={leaveRoom} disabled={busy || !socket} className="rounded-lg border border-red-400 px-4 py-3 text-red-200 disabled:opacity-40">Keluar room</button>
        </header>

        {!room ? (
          <p className="rounded-2xl border border-stone-700 bg-stone-900 p-6">Memuat state room...</p>
        ) : (
          <>
            <section className="grid gap-4 rounded-2xl border border-stone-700 bg-stone-900 p-6 sm:grid-cols-3">
              <p>Status: <strong>{room.status}</strong></p>
              <p>Timer: <strong>{room.turnSeconds} detik</strong></p>
              <p>Siap mulai: <strong>{room.canStart ? "ya" : "belum"}</strong></p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              {room.players.map((player) => (
                <article key={player.playerId} className="rounded-2xl border border-stone-700 bg-stone-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">{player.name}{player.playerId === playerId ? " · Kamu" : ""}</h2>
                      <p className="text-sm text-stone-400">{player.avatarId}</p>
                    </div>
                    <span className={player.connected ? "text-emerald-400" : "text-stone-500"}>{player.connected ? "online" : "offline"}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-stone-400">Peran</dt><dd>{player.isHost ? "Host" : "Pemain"}</dd>
                    <dt className="text-stone-400">Pawn</dt><dd>{player.pawn ?? "belum pilih"}</dd>
                    <dt className="text-stone-400">Ready</dt><dd>{player.ready ? "siap" : "belum"}</dd>
                  </dl>
                  {roomPlayer?.isHost && !player.isHost ? (
                    <button
                      type="button"
                      disabled={busy || !socket}
                      onClick={() => {
                        if (!socket) return;
                        setPending("kick");
                        socket.timeout(3_000).emit(
                          "room:kick",
                          { requestId: createRequestId(), targetPlayerId: player.playerId },
                          (error, response) => handleResponse("Kick", error ? { ok: false, error: "INTERNAL" } : response),
                        );
                      }}
                      className="mt-4 rounded-lg border border-red-400 px-3 py-2 text-sm text-red-200 disabled:opacity-40"
                    >Keluarkan</button>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="grid gap-5 rounded-2xl border border-stone-700 bg-stone-900 p-6 lg:grid-cols-3">
              <div className="grid gap-3">
                <h2 className="font-bold">Pilih pawn</h2>
                {PAWNS.map((pawn) => {
                  const taken = room.players.some((player) => player.playerId !== playerId && player.pawn === pawn.id);
                  return (
                    <button
                      key={pawn.id}
                      type="button"
                      disabled={busy || taken || !socket}
                      onClick={() => {
                        if (!socket) return;
                        setPending("pawn");
                        socket.timeout(3_000).emit(
                          "room:pawn",
                          { requestId: createRequestId(), pawn: pawn.id },
                          (error, response) => handleResponse("Pilih pawn", error ? { ok: false, error: "INTERNAL" } : response),
                        );
                      }}
                      className={`rounded-lg border px-3 py-2 text-left disabled:opacity-40 ${roomPlayer?.pawn === pawn.id ? "border-amber-400 bg-amber-400/10" : "border-stone-600"}`}
                    >{pawn.label}{taken ? " · dipakai" : ""}</button>
                  );
                })}
              </div>

              <div className="grid content-start gap-3">
                <h2 className="font-bold">Kesiapan</h2>
                <button
                  type="button"
                  disabled={busy || !roomPlayer?.pawn || !socket}
                  onClick={() => {
                    if (!socket) return;
                    setPending("ready");
                    socket.timeout(3_000).emit(
                      "room:ready",
                      { requestId: createRequestId(), ready: !roomPlayer?.ready },
                      (error, response) => handleResponse("Ready", error ? { ok: false, error: "INTERNAL" } : response),
                    );
                  }}
                  className="rounded-lg bg-emerald-500 px-4 py-3 font-bold text-stone-950 disabled:opacity-40"
                >{roomPlayer?.ready ? "Batalkan ready" : "Saya siap"}</button>
                {!roomPlayer?.pawn ? <p className="text-sm text-stone-400">Pilih pawn sebelum ready.</p> : null}
              </div>

              <div className="grid content-start gap-3">
                <h2 className="font-bold">Timer giliran</h2>
                {([30, 60] as const).map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    disabled={busy || !roomPlayer?.isHost || !socket}
                    onClick={() => {
                      if (!socket) return;
                      setPending("timer");
                      socket.timeout(3_000).emit(
                        "room:timer",
                        { requestId: createRequestId(), turnSeconds: seconds },
                        (error, response) => handleResponse("Timer", error ? { ok: false, error: "INTERNAL" } : response),
                      );
                    }}
                    className={`rounded-lg border px-4 py-3 disabled:opacity-40 ${room.turnSeconds === seconds ? "border-amber-400 text-amber-300" : "border-stone-600"}`}
                  >{seconds} detik</button>
                ))}
                {!roomPlayer?.isHost ? <p className="text-sm text-stone-400">Hanya host yang dapat mengubah timer.</p> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-stone-600 p-6">
              <h2 className="text-xl font-bold">Mulai game</h2>
              <p className="mt-2 text-stone-400">
                {room.canStart ? "Semua pemain siap. Game start akan diimplementasikan pada fase berikutnya." : room.startBlockReason === "NEED_MIN_PLAYERS" ? "Butuh minimal dua pemain." : "Semua pemain harus memilih pawn dan ready."}
              </p>
              {roomPlayer?.isHost ? (
                <button
                  type="button"
                  disabled={busy || !room.canStart || !socket}
                  onClick={() => {
                    if (!socket) return;
                    setPending("start");
                    socket.timeout(3_000).emit(
                      "game:start",
                      { requestId: createRequestId() },
                      (error, response) => handleResponse(
                        "Mulai game",
                        error ? { ok: false, error: "INTERNAL" } : response,
                      ),
                    );
                  }}
                  className="mt-4 rounded-lg bg-amber-400 px-4 py-3 font-bold text-stone-950 disabled:opacity-40"
                >
                  {countdown ? "Game dimulai..." : "Mulai game"}
                </button>
              ) : null}
            </section>
          </>
        )}

        {message ? <p role="status" className="rounded-lg bg-stone-800 px-4 py-3 text-amber-200">{message}</p> : null}
      </div>
    </main>
  );
}
