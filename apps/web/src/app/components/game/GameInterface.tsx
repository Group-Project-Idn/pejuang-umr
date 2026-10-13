"use client";

import type {
  CalendarEventPayload,
  HexCoord,
  PublicGameState,
  RoomState,
  Snapshot,
} from "@pejuang/shared";
import { useEffect, useMemo, useState } from "react";
import { getSeasonHint } from "@/lib/board-hud";
import { getTurnSecondsLeft } from "@/lib/game-view";
import { resolveHexClick } from "@/lib/hex-detail";
import {
  buildInviteResultView,
  canUseInviteCard,
  getDisabledInvitePawnIds,
  getInvitePopup,
  getPlayerName,
  INVITE_FLOW_CANCELLED_NOTICE,
  isInviteExpired,
  resolveInviteFlow,
  selectUnseenInviteResults,
  type InviteFlow,
} from "@/lib/invites";
import CalendarEventView from "../game-v2/CalendarEventView";
import NoticeViews from "../game-v2/NoticeViews";
import HexDetailSheet from "../game-v2/HexDetailSheet";
import {
  InviteCardSheet,
  InviteConfirmSheet,
  InviteIncomingView,
  InvitePickBanner,
  InviteResultsView,
} from "../game-v2/invites";
import GameBoard from "./GameBoard";
import Scoreboard from "./Scoreboard";
import MonthChangeView from "./MonthChangeView";
import type { TransientNotice } from "@/lib/room-session-view";
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
  actionMessage,
  actionPending,
  seasonHint,
  goldNotice,
  notices,
  monthError,
  onDismissNotice,
  onAnswerCalendar,
  onPayDebt,
  onChooseHex,
  invitePending,
  onSendInvite,
  onRespondInvite,
}: {
  room: RoomState;
  game: PublicGameState;
  me: Snapshot["me"] | null;
  connectionStatus: string;
  serverClockOffsetMs: number;
  actionMessage: string;
  actionPending: boolean;
  seasonHint: string | null;
  goldNotice: { id: number; text: string } | null;
  notices: readonly TransientNotice[];
  monthError?: string;
  onDismissNotice: (id: number) => void;
  onAnswerCalendar: (
    eventId: string,
    choice: CalendarEventPayload["choices"][number]["id"],
  ) => void;
  onPayDebt: (month: number, amount: number) => void;
  onChooseHex: (
    turnId: string,
    hex: HexCoord,
    mode: "normal" | "deadEnd",
  ) => void;
  invitePending: boolean;
  onSendInvite: (payload: { turnId: string; cardId: string; targetPlayerId: string }) => void;
  onRespondInvite: (inviteId: string, answer: "join" | "decline") => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedHexKey, setSelectedHexKey] = useState<string | null>(null);
  const [dismissedNoticeId, setDismissedNoticeId] = useState<number | null>(null);
  const [inviteFlow, setInviteFlow] = useState<InviteFlow | null>(null);
  const [seenInviteIds, setSeenInviteIds] = useState<ReadonlySet<string>>(() => new Set());
  const [expiredInviteId, setExpiredInviteId] = useState<string | null>(null);
  const pendingInvite = me?.pendingInvite ?? null;
  const needsTick = Boolean(game.turnDeadline || pendingInvite);
  useEffect(() => {
    if (!needsTick) return;
    const timer = window.setInterval(
      () => setNow(Date.now()),
      250,
    );
    return () => window.clearInterval(timer);
  }, [needsTick]);
  useEffect(() => {
    if (!goldNotice) return;
    const timer = window.setTimeout(
      () => setDismissedNoticeId(goldNotice.id),
      5000,
    );
    return () => window.clearTimeout(timer);
  }, [goldNotice]);
  const visibleNotice = goldNotice && goldNotice.id !== dismissedNoticeId
    ? goldNotice.text
    : null;
  const timeLeft = getTurnSecondsLeft({
    localNow: now,
    serverClockOffsetMs,
    deadline: game.turnDeadline,
  });

  const serverNow = now + serverClockOffsetMs;
  // Alur Ajakan batal sendiri bila Timer Giliran habis, giliran berganti, atau kartu hilang.
  const activeFlow = resolveInviteFlow(inviteFlow, me, game, serverNow);
  const flowCancelled = inviteFlow !== null && activeFlow === null;
  const inviteButtonEnabled = canUseInviteCard(me, game) && !actionPending;
  const popup = getInvitePopup(me, now, serverClockOffsetMs);
  const popupExpired = isInviteExpired(pendingInvite, now, serverClockOffsetMs);
  const expiredNotice = popupExpired && pendingInvite?.inviteId !== expiredInviteId;
  const resultViews = selectUnseenInviteResults(me?.inviteResults ?? [], seenInviteIds)
    .map((result) => buildInviteResultView(result, me?.playerId ?? "", room))
    .filter((view) => view !== null);
  const inviteTargeting = activeFlow?.step === "pick" && me
    ? {
        disabledIds: getDisabledInvitePawnIds(game, me.playerId),
        onSelect: (targetPlayerId: string) =>
          setInviteFlow({ step: "confirm", turnId: activeFlow.turnId, cardId: activeFlow.cardId, targetPlayerId }),
      }
    : null;

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
  const litOptions = pendingTurn?.options ?? [];
  // Dihitung ulang tiap render, jadi isi sheet ikut berganti saat heksa lain diklik.
  const detail = selectedHexKey
    ? resolveHexClick(selectedHexKey, litOptions, game.openedHexes)
    : null;

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
            <small className="season-hint" role="status">
              {getSeasonHint(game.calendar.season, seasonHint)}
            </small>
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
            {game.phase === "reveal" ? (
              <div role="status" className="gold-badge">Fase Pembalikan · Realita dibuka sesuai urutan giliran</div>
            ) : null}
            {game.gold ? <div className="gold-badge">✦<strong>Petak<br />Emas</strong></div> : null}
            <GameBoard
              game={game}
              room={room}
              lit={litOptions}
              inviteTargeting={inviteTargeting}
              onSelectHex={(key) => {
                if (resolveHexClick(key, litOptions, game.openedHexes)) {
                  setSelectedHexKey(key);
                }
              }}
            />
            {pendingTurn ? (
              <p className="turn-options" role="status">
                <strong>
                  {turnMode === "deadEnd"
                    ? "Jalan Buntu · ketuk heksa menyala untuk melompat (+1 Level Stress)"
                    : "Ketuk heksa yang menyala untuk melihat detailnya"}
                </strong>
              </p>
            ) : null}
            {visibleNotice ? (
              <div className="gold-notice" role="status">{visibleNotice}</div>
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
                {activePlayer
                  ? `Giliran ${activePlayer.name}`
                  : "Menunggu giliran"}
              </strong>
              <small>Semua aksi permainan divalidasi server</small>
            </div>
          </div>
          <div className="action-buttons">
            <button type="button" disabled aria-label="Ekspresi belum tersedia"><span>☺</span><small>Emote</small></button>
            <button
              type="button"
              className="invite-button"
              disabled={!inviteButtonEnabled}
              aria-label="Kartu Ajakan"
              onClick={() => {
                if (pendingTurn) setInviteFlow({ step: "card", turnId: pendingTurn.turnId });
              }}
            ><i>{me?.inviteCard ? 1 : 0}</i><span>▱</span><small>Kartu Ajakan</small></button>
          </div>
        </footer>
      </section>
      <p className="game-tip">Klik heksa yang menyala atau heksa terbuka · papan dapat diputar dan diperbesar</p>
      {actionMessage ? <p className="game-action-message" role="status">{actionMessage}</p> : null}
      <HexDetailSheet
        detail={detail}
        pending={actionPending}
        onChoose={(hex) => {
          if (!pendingTurn || !detail?.canChoose) return;
          onChooseHex(pendingTurn.turnId, hex, turnMode);
          setSelectedHexKey(null);
        }}
        onClose={() => setSelectedHexKey(null)}
      />
      {activeFlow?.step === "pick" ? <InvitePickBanner onCancel={() => setInviteFlow(null)} /> : null}
      {flowCancelled ? (
        <p className="game-action-message" role="status">
          {INVITE_FLOW_CANCELLED_NOTICE}{" "}
          <button type="button" className="underline" onClick={() => setInviteFlow(null)}>Tutup</button>
        </p>
      ) : null}
      <InviteCardSheet
        card={me?.inviteCard ?? null}
        open={activeFlow?.step === "card"}
        onClose={() => setInviteFlow(null)}
        onPickTarget={() => {
          if (activeFlow?.step === "card" && me?.inviteCard) {
            setInviteFlow({ step: "pick", turnId: activeFlow.turnId, cardId: me.inviteCard.cardId });
          }
        }}
      />
      <InviteConfirmSheet
        flow={activeFlow}
        targetName={activeFlow?.step === "confirm" ? getPlayerName(room, activeFlow.targetPlayerId) : ""}
        plan={me?.inviteCard?.plan ?? null}
        pending={invitePending}
        onCancel={() => setInviteFlow(null)}
        onConfirm={() => {
          if (activeFlow?.step !== "confirm" || !pendingTurn) return;
          onSendInvite({
            turnId: pendingTurn.turnId,
            cardId: activeFlow.cardId,
            targetPlayerId: activeFlow.targetPlayerId,
          });
          setInviteFlow(null);
        }}
      />
      <InviteIncomingView
        popup={popup}
        expired={expiredNotice}
        pending={invitePending}
        onRespond={onRespondInvite}
        onDismissExpired={() => pendingInvite && setExpiredInviteId(pendingInvite.inviteId)}
      />
      <InviteResultsView
        results={resultViews}
        onDismiss={(inviteId) => setSeenInviteIds((seen) => new Set(seen).add(inviteId))}
      />
      <CalendarEventView
        event={me?.pendingCalendar ?? null}
        pending={actionPending}
        onAnswer={onAnswerCalendar}
      />
      <MonthChangeView
        summary={me?.pendingMonth ?? null}
        pending={actionPending}
        serverClockOffsetMs={serverClockOffsetMs}
        error={monthError}
        onPayDebt={onPayDebt}
      />
      <NoticeViews notices={notices} onDismiss={onDismissNotice} />
    </main>
  );
}
