"use client";

import type {
  Ack,
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
import { WaitingRoom } from "./waiting-room";

export { getStartHelper, ROOM_COPY } from "./waiting-room";

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

  function emitRoomAction(
    action: string,
    emit: (gameSocket: GameSocket) => void,
  ) {
    if (!socket || pending) return;
    setPending(action);
    emit(socket);
  }

  function copyRoomCode() {
    navigator.clipboard?.writeText(code)
      .then(() => setMessage("Kode room berhasil disalin."))
      .catch(() => setMessage("Kode room tidak bisa disalin di browser ini."));
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
    <WaitingRoom
      room={room}
      playerId={playerId}
      connectionStatus={status}
      serverClockOffsetMs={serverClockOffsetMs}
      countdownDeadline={countdown}
      busy={busy || !socket}
      message={message}
      onLeave={leaveRoom}
      onOpenGuide={() => router.push("/cara-main")}
      onCopyCode={copyRoomCode}
      onSelectPawn={(pawn) => emitRoomAction("pawn", (gameSocket) => {
        gameSocket.timeout(3_000).emit(
          "room:pawn",
          { requestId: createRequestId(), pawn },
          (error, response) => handleResponse("Pilih pion", error ? { ok: false, error: "INTERNAL" } : response),
        );
      })}
      onReady={() => emitRoomAction("ready", (gameSocket) => {
        gameSocket.timeout(3_000).emit(
          "room:ready",
          { requestId: createRequestId(), ready: !roomPlayer?.ready },
          (error, response) => handleResponse("Status siap", error ? { ok: false, error: "INTERNAL" } : response),
        );
      })}
      onTimer={(turnSeconds) => emitRoomAction("timer", (gameSocket) => {
        gameSocket.timeout(3_000).emit(
          "room:timer",
          { requestId: createRequestId(), turnSeconds },
          (error, response) => handleResponse("Timer", error ? { ok: false, error: "INTERNAL" } : response),
        );
      })}
      onKick={(targetPlayerId) => emitRoomAction("kick", (gameSocket) => {
        gameSocket.timeout(3_000).emit(
          "room:kick",
          { requestId: createRequestId(), targetPlayerId },
          (error, response) => handleResponse("Keluarkan pemain", error ? { ok: false, error: "INTERNAL" } : response),
        );
      })}
      onStart={() => emitRoomAction("start", (gameSocket) => {
        gameSocket.timeout(3_000).emit(
          "game:start",
          { requestId: createRequestId() },
          (error, response) => handleResponse("Mulai game", error ? { ok: false, error: "INTERNAL" } : response),
        );
      })}
    />
  );
}
