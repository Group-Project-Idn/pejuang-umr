"use client";

import type {
  Ack,
  CalendarEventPayload,
  DeadEndPayload,
  HexCoord,
  MonthSummaryPayload,
  PrivateStatus,
  ReflectionReadyPayload,
  RoomState,
  Snapshot,
  TurnOptionsPayload,
} from "@pejuang/shared";
import { CharacterIdSchema } from "@pejuang/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import GameInterface from "@/app/components/game/GameInterface";
import EliminationScreen from "@/app/components/screens/EliminationScreen";
import ResultScreen from "@/app/components/screens/ResultScreen";
import { copyTextToClipboard } from "@/lib/clipboard";
import { clearGuestSession, readGuestSession } from "@/lib/guest-session";
import {
  type GameFinished,
  type GamePatch,
  type GameStarted,
  type GoldExpired,
  type GoldSpawned,
  type PlayerConnection,
  type PlayerEliminated,
  type PublicGameEvent,
  type RoundReveal,
  type SeasonChanged,
  type TileOpened,
  type TileResolved,
  type TurnStart,
} from "@/lib/game-view";
import { canRematch, getRematchMessage, selectRoomScreen } from "@/lib/result-screens";
import { createRequestId } from "@/lib/request-id";
import { clearRoomCode, writeRoomCode } from "@/lib/room-session";
import {
  applyPrivateStatus,
  applyReflectionReady,
  applyRoomState,
  applySessionCalendarEvent,
  applySessionMonthSummary,
  applySessionGamePatch,
  applySessionPlayerConnection,
  applySessionPublicEvent,
  applySessionSnapshot,
  applySessionTurnOptions,
  clearAcceptedPrivateAction,
  createRoomSessionView,
  type RoomSessionView,
  type SessionTransition,
} from "@/lib/room-session-view";
import { createSessionResumeController } from "@/lib/session-resume-controller";
import { disconnectSocket, getSocket, type GameSocket } from "@/lib/socket";
import { subscribeSocketEvents } from "@/lib/socket-subscriptions";
import { getRoomActionMessage, WaitingRoom } from "./waiting-room";

export { getStartHelper, ROOM_COPY } from "./waiting-room";

export function LobbyClient({ code }: { code: string }) {
  const router = useRouter();
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const sessionViewRef = useRef<RoomSessionView>(createRoomSessionView());
  const [sessionView, setSessionView] = useState<RoomSessionView>(
    createRoomSessionView,
  );
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [status, setStatus] = useState("menghubungkan...");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const room = sessionView.room;
  const game = sessionView.gameView.game;

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
    let mounted = true;
    const commitSession = (
      update: (current: RoomSessionView) => RoomSessionView,
    ) => {
      if (!mounted) return;
      const next = update(sessionViewRef.current);
      sessionViewRef.current = next;
      setSessionView(next);
    };
    const resumeController = createSessionResumeController({
      isConnected: () => gameSocket.connected,
      getPrivateRevision: () => sessionViewRef.current.privateRevision,
      send: (callback) => gameSocket.timeout(3_000).emit(
        "session:resume",
        { requestId: createRequestId(), roomCode: code },
        callback,
      ),
      onStart: () => setStatus("memulihkan room..."),
      onTransportError: () => {
        setStatus("gagal terhubung");
        setMessage("Server tidak merespons saat memulihkan room.");
      },
      onRejected: (response) => {
        clearRoomCode();
        setMessage(`Gagal: ${response.error}`);
        router.replace("/lobby");
      },
      onSnapshot: (snapshot, privateRevisionAtRequest) => {
        let snapshotAccepted = false;
        commitSession((current) => {
          const next = applySessionSnapshot(
            current,
            snapshot,
            Date.now(),
            privateRevisionAtRequest,
          );
          snapshotAccepted = next !== current;
          return next;
        });
        setStatus("terhubung");
        return snapshotAccepted;
      },
    });
    const resume = resumeController.request;
    const commitTransition = (
      transition: (current: RoomSessionView) => SessionTransition,
    ) => {
      let needsResume = false;
      commitSession((current) => {
        const result = transition(current);
        needsResume = result.needsResume;
        return result.state;
      });
      if (needsResume) resume();
    };
    const onRoomState = (nextRoom: RoomState) => {
      commitSession((current) => applyRoomState(current, nextRoom));
      if (nextRoom.status !== "countdown") setCountdown(null);
    };
    const onDisconnect = () => {
      setStatus("terputus · mencoba kembali");
      setCountdown(null);
    };
    const onCountdown = ({ deadline }: { deadline: number; seconds: 3 }) => {
      setCountdown(deadline);
    };
    const onSnapshot = (snapshot: Snapshot) => {
      commitSession((current) =>
        applySessionSnapshot(current, snapshot, Date.now()),
      );
      setCountdown(null);
    };
    const onGamePatch = (patch: GamePatch) => {
      commitTransition((current) => applySessionGamePatch(current, patch));
    };
    const onPlayerStatus = (nextStatus: PrivateStatus) => {
      commitSession((current) => applyPrivateStatus(current, nextStatus));
    };
    const onReflectionReady = (payload: ReflectionReadyPayload) => {
      commitSession((current) => applyReflectionReady(current, payload));
    };
    const onPublicGameEvent = (event: PublicGameEvent) => {
      commitTransition((current) => applySessionPublicEvent(current, event));
    };
    const onGameStarted = (payload: GameStarted) =>
      onPublicGameEvent({ type: "game:started", payload });
    const onTurnStart = (payload: TurnStart) =>
      onPublicGameEvent({ type: "turn:start", payload });
    const onTileOpened = (payload: TileOpened) =>
      onPublicGameEvent({ type: "tile:opened", payload });
    const onTileResolved = (payload: TileResolved) =>
      onPublicGameEvent({ type: "tile:resolved", payload });
    const onRoundReveal = (payload: RoundReveal) =>
      onPublicGameEvent({ type: "round:reveal", payload });
    const onGoldSpawned = (payload: GoldSpawned) =>
      onPublicGameEvent({ type: "gold:spawned", payload });
    const onGoldExpired = (payload: GoldExpired) =>
      onPublicGameEvent({ type: "gold:expired", payload });
    const onSeasonChanged = (payload: SeasonChanged) =>
      onPublicGameEvent({ type: "season:changed", payload });
    const onPlayerEliminated = (payload: PlayerEliminated) =>
      onPublicGameEvent({ type: "player:eliminated", payload });
    const onGameFinished = (payload: GameFinished) =>
      onPublicGameEvent({ type: "game:finished", payload });
    const onConnection = (payload: PlayerConnection) => {
      commitTransition((current) =>
        applySessionPlayerConnection(current, payload),
      );
    };
    const onCalendarEvent = (payload: CalendarEventPayload) => {
      commitTransition((current) => applySessionCalendarEvent(current, payload));
    };
    const onMonthSummary = (payload: MonthSummaryPayload) => {
      commitSession((current) => applySessionMonthSummary(current, payload));
    };
    const onTurnOptions = (payload: TurnOptionsPayload) => {
      commitSession((current) => applySessionTurnOptions(current, payload));
    };
    const onDeadEnd = (payload: DeadEndPayload) => {
      commitSession((current) => applySessionTurnOptions(current, payload));
    };
    const onKicked = () => {
      clearRoomCode();
      router.replace("/lobby");
    };
    const onConnectError = (error: Error) => {
      setCountdown(null);
      if (error.message === "UNAUTHORIZED") {
        clearGuestSession();
        disconnectSocket();
        router.replace("/lobby");
        return;
      }
      setStatus("gagal terhubung");
      setMessage("Server bermasalah. Periksa koneksi internet kamu.");
    };
    const unsubscribe = subscribeSocketEvents(gameSocket, [
      ["connect_error", onConnectError],
      ["connect", resume],
      ["room:state", onRoomState],
      ["disconnect", onDisconnect],
      ["room:countdown", onCountdown],
      ["session:snapshot", onSnapshot],
      ["game:patch", onGamePatch],
      ["player:status", onPlayerStatus],
      ["reflection:ready", onReflectionReady],
      ["calendar:event", onCalendarEvent],
      ["month:summary", onMonthSummary],
      ["turn:options", onTurnOptions],
      ["turn:dead-end", onDeadEnd],
      ["player:connection", onConnection],
      ["game:started", onGameStarted],
      ["turn:start", onTurnStart],
      ["tile:opened", onTileOpened],
      ["round:reveal", onRoundReveal],
      ["tile:resolved", onTileResolved],
      ["gold:spawned", onGoldSpawned],
      ["gold:expired", onGoldExpired],
      ["season:changed", onSeasonChanged],
      ["player:eliminated", onPlayerEliminated],
      ["game:finished", onGameFinished],
      ["room:kicked", onKicked],
    ]);
    if (gameSocket.connected) resume();
    else gameSocket.connect();
    return () => {
      mounted = false;
      resumeController.dispose();
      unsubscribe();
    };
  }, [code, router]);

  const handleResponse = useCallback((action: string, response: Ack) => {
    setPending(null);
    setMessage(getRoomActionMessage(action, response));
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

  function rematch() {
    if (!socket || pending) return;
    setPending("rematch");
    socket.timeout(3_000).emit(
      "room:rematch",
      { requestId: createRequestId() },
      (error, response) => {
        const result: Ack<{ room: RoomState }> = error ? { ok: false, error: "INTERNAL" } : response;
        setPending(null);
        if (result.ok) {
          const next = applyRoomState(sessionViewRef.current, result.room);
          sessionViewRef.current = next;
          setSessionView(next);
          setMessage("");
        } else {
          setMessage(getRematchMessage(result));
        }
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

  function answerCalendar(eventId: string, choice: CalendarEventPayload["choices"][number]["id"]) {
    if (!socket || pending) return;
    setPending("calendar");
    socket.timeout(3_000).emit(
      "calendar:answer",
      { requestId: createRequestId(), eventId, choice },
      (error, response) => {
        const result: Ack = error ? { ok: false, error: "INTERNAL" } : response;
        if (result.ok) {
          const next = clearAcceptedPrivateAction(sessionViewRef.current, {
            kind: "calendar",
            eventId,
          });
          sessionViewRef.current = next;
          setSessionView(next);
        }
        handleResponse("Jawaban kalender", result);
      },
    );
  }

  function payDebt(month: number, amount: number) {
    if (!socket || pending) return;
    setPending("month");
    socket.timeout(3_000).emit(
      "month:pay-debt",
      { requestId: createRequestId(), month, amount },
      (error, response) => {
        const result: Ack = error ? { ok: false, error: "INTERNAL" } : response;
        if (result.ok) {
          const next = clearAcceptedPrivateAction(sessionViewRef.current, { kind: "month", month });
          sessionViewRef.current = next;
          setSessionView(next);
        }
        handleResponse("Pembayaran hutang", result);
      },
    );
  }

  function chooseHex(turnId: string, hex: HexCoord, mode: "normal" | "deadEnd") {
    if (!socket || pending) return;
    setPending("turn");
    const event = mode === "deadEnd" ? "turn:jump" : "turn:choose";
    socket.timeout(3_000).emit(
      event,
      { requestId: createRequestId(), turnId, hex },
      (error, response) => {
        const result: Ack = error ? { ok: false, error: "INTERNAL" } : response;
        if (result.ok) {
          const next = clearAcceptedPrivateAction(sessionViewRef.current, {
            kind: "turn",
            turnId,
          });
          sessionViewRef.current = next;
          setSessionView(next);
        }
        handleResponse(mode === "deadEnd" ? "Lompat" : "Pilih heksa", result);
      },
    );
  }

  async function copyRoomCode() {
    const copied = await copyTextToClipboard(code, navigator.clipboard);
    setMessage(copied
      ? "Kode room berhasil disalin."
      : "Clipboard tidak tersedia. Salin kode room secara manual.");
  }

  const roomPlayer = room?.players.find(
    (player) => player.playerId === playerId,
  );
  const busy = pending !== null;

  const screen = selectRoomScreen({
    room,
    game,
    result: sessionView.result,
    playerId: sessionView.me?.playerId ?? playerId,
  });

  if (screen === "elimination") {
    return (
      <EliminationScreen
        status={sessionView.me?.status ?? null}
        reflection={sessionView.me?.reflection}
        busy={busy || !socket}
        message={message}
        onLeave={leaveRoom}
      />
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        result={sessionView.result}
        reflection={sessionView.me?.reflection}
        isHost={canRematch(room, sessionView.me?.playerId ?? playerId)}
        busy={busy || !socket}
        message={message}
        onRematch={rematch}
        onLeave={leaveRoom}
      />
    );
  }

  if (screen === "game" && room && game) {
    return (
      <GameInterface
        room={room}
        game={game}
        me={sessionView.me}
        connectionStatus={status}
        serverClockOffsetMs={sessionView.serverClockOffsetMs}
        actionMessage={message}
        seasonHint={sessionView.seasonHint}
        goldNotice={sessionView.goldNotice}
        actionPending={pending === "calendar" || pending === "turn" || pending === "month"}
        onPayDebt={payDebt}
        onAnswerCalendar={answerCalendar}
        onChooseHex={chooseHex}
      />
    );
  }

  return (
    <WaitingRoom
      room={room}
      playerId={playerId}
      connectionStatus={status}
      serverClockOffsetMs={sessionView.serverClockOffsetMs}
      countdownDeadline={countdown}
      busy={busy || !socket}
      message={message}
      onLeave={leaveRoom}
      onOpenGuide={() => router.push("/cara-main")}
      onCopyCode={copyRoomCode}
      onSelectAvatar={(avatarId) => emitRoomAction("avatar", (gameSocket) => {
        const parsed = CharacterIdSchema.safeParse(avatarId);
        if (!parsed.success) return handleResponse("Pilih karakter", { ok: false, error: "INVALID_PAYLOAD" });
        gameSocket.timeout(3_000).emit(
          "room:avatar",
          { requestId: createRequestId(), avatarId: parsed.data },
          (error, response) => handleResponse("Pilih karakter", error ? { ok: false, error: "INTERNAL" } : response),
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
