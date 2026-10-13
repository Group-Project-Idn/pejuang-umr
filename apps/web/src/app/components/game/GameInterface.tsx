"use client";

import type {
  CalendarEventPayload,
  HexCoord,
  PublicGameState,
  RoomState,
  Snapshot,
} from "@pejuang/shared";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getTurnSecondsLeft } from "@/lib/game-view";
import { resolveHexClick } from "@/lib/hex-detail";
import {
  canUseInviteCard,
  getDisabledInvitePawnIds,
  getInvitePopup,
  getPlayerName,
  getSelectableInviteTargetIds,
  INVITE_FLOW_CANCELLED_NOTICE,
  isInviteExpired,
  resolveInviteFlow,
  type InviteFlow,
} from "@/lib/invites";
import {
  buildRevealRows,
  buildRevealSchedule,
  getRevealOrder,
  getRevealProgress,
  maskUnrevealed,
  OUTCOME_LABEL,
} from "@/lib/reveal";
import NoticeViews from "./NoticeViews";
import HexDetailSheet from "./HexDetailSheet";
import RevealPopup from "./RevealPopup";
import {
  InviteCardSheet,
  InviteConfirmSheet,
  InviteIncomingView,
  InvitePickBanner,
} from "./invites";
import GameBoard from "./GameBoard";
import Scoreboard from "./Scoreboard";
import PopupGrid from "./PopupGrid";
import {
  buildResultsGrid,
  buildStartGrid,
  getVisibleCards,
  pickGrid,
  SEASON_LABEL,
} from "@/lib/popup-cards";
import type { PopupBatch, ResultsWindow, TransientNotice } from "@/lib/room-session-view";
import StatusPanel from "./StatusPanel";

const SEASON_ICON = {
  rainy: "☂",
  dry: "☀",
  transition: "◐",
} as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

export default function GameInterface({
  room,
  game,
  me,
  connectionStatus,
  serverClockOffsetMs,
  actionMessage,
  actionPending,
  goldNotice,
  notices,
  popupSources,
  monthError,
  onDismissNotice,
  onAnswerCalendar,
  onPayDebt,
  onChooseHex,
  invitePending,
  onSendInvite,
  onRespondInvite,
  devFinish,
}: {
  room: RoomState;
  game: PublicGameState;
  me: Snapshot["me"] | null;
  connectionStatus: string;
  serverClockOffsetMs: number;
  actionMessage: string;
  actionPending: boolean;
  goldNotice: { id: number; text: string } | null;
  notices: readonly TransientNotice[];
  /** Sumber kartu popup serentak dari sesi: batch awal ronde, notifikasi, dan jendela hasil. */
  popupSources: {
    popupBatch: PopupBatch | null;
    seasonNotice: { step: number; season: "rainy" | "dry" | "transition"; hint: string } | null;
    goldSpawnedStep: number | null;
    resultsWindow: ResultsWindow | null;
  };
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
  devFinish?: { pending: boolean; onFinish: () => void };
}) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedHexKey, setSelectedHexKey] = useState<string | null>(null);
  const [dismissedNoticeId, setDismissedNoticeId] = useState<number | null>(null);
  const [inviteFlow, setInviteFlow] = useState<InviteFlow | null>(null);
  // Kartu popup yang ditutup pemain di layarnya sendiri; id memuat batch/ronde, jadi tidak bocor ke ronde lain.
  const [dismissedCardIds, setDismissedCardIds] = useState<ReadonlySet<string>>(() => new Set());
  const [expiredInviteId, setExpiredInviteId] = useState<string | null>(null);
  // Popup Fase Pembalikan diminimalkan untuk revealEndsAt ini; fase berikutnya muncul lagi.
  const [minimizedRevealEndsAt, setMinimizedRevealEndsAt] = useState<number | null>(null);
  const pendingInvite = me?.pendingInvite ?? null;
  const reducedMotion = usePrefersReducedMotion();
  const revealEndsAt = game.phase === "reveal" ? game.revealEndsAt : null;
  const startGrid = buildStartGrid({ game, me, ...popupSources });
  const resultsGrid = buildResultsGrid({ game, me, room, resultsWindow: popupSources.resultsWindow, notices });
  const popupGrid = pickGrid(startGrid, resultsGrid);
  const needsTick = Boolean(game.turnDeadline || pendingInvite || revealEndsAt || popupGrid);
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
  // Order dan durasi dari server (snapshot/patch) supaya reconnect di tengah Fase Pembalikan tetap punya jadwal.
  const revealSchedule = useMemo(
    () => (revealEndsAt === null
      ? null
      : buildRevealSchedule(getRevealOrder(game), revealEndsAt, game.revealStepMs)),
    [game, revealEndsAt],
  );
  const revealProgress = revealSchedule
    ? getRevealProgress(revealSchedule, serverNow, reducedMotion)
    : null;
  const shownGame = revealSchedule && revealProgress
    ? maskUnrevealed(game, revealSchedule, revealProgress)
    : game;
  const revealRows = revealSchedule && revealProgress
    ? buildRevealRows(shownGame, revealSchedule, revealProgress, room)
    : [];
  const revealPopupOpen = revealEndsAt !== null &&
    serverNow < revealEndsAt &&
    revealRows.length > 0 &&
    minimizedRevealEndsAt !== revealEndsAt;
  const latestReveal = revealSchedule && revealProgress
    ? [...revealSchedule.steps].reverse().find((step) => revealProgress.flippedKeys.has(step.key))
    : undefined;
  const latestRevealTile = latestReveal
    ? shownGame.openedHexes.find(
        (opened) => opened.step === game.calendar.step &&
          opened.byPlayerId === latestReveal.playerId &&
          opened.reality !== null,
      )
    : undefined;
  // Alur Ajakan batal sendiri bila Timer Giliran habis, giliran berganti, atau kartu hilang.
  const activeFlow = resolveInviteFlow(inviteFlow, me, game, serverNow);
  const flowCancelled = inviteFlow !== null && activeFlow === null;
  const inviteButtonEnabled = canUseInviteCard(me, game) && !actionPending;
  const popup = getInvitePopup(me, now, serverClockOffsetMs);
  const popupExpired = isInviteExpired(pendingInvite, now, serverClockOffsetMs);
  const expiredNotice = popupExpired && pendingInvite?.inviteId !== expiredInviteId;
  const popupCards = getVisibleCards(popupGrid, dismissedCardIds, serverNow);
  const inviteTargeting = activeFlow?.step === "pick" && me
    ? {
        disabledIds: getDisabledInvitePawnIds(game, me.playerId),
        onSelect: (targetPlayerId: string) =>
          getSelectableInviteTargetIds(game, room, me.playerId).includes(targetPlayerId) &&
          setInviteFlow({ step: "confirm", turnId: activeFlow.turnId, cardId: activeFlow.cardId, targetPlayerId }),
      }
    : null;

  const activePlayer = useMemo(
    () => room.players.find(
      (player) => player.playerId === game.activePlayerId,
    ),
    [game.activePlayerId, room.players],
  );
  const eventMessage = game.openedHexes.at(-1)?.title ?? null;
  const pendingTurn = me?.pendingTurn ?? null;
  const turnMode = pendingTurn && "stressPenalty" in pendingTurn ? "deadEnd" : "normal";
  const litOptions = pendingTurn?.options ?? [];
  // Dihitung ulang tiap render, jadi isi sheet ikut berganti saat heksa lain diklik.
  const detail = selectedHexKey
    ? resolveHexClick(selectedHexKey, litOptions, shownGame.openedHexes)
    : null;

  return (
    <main className="game-page">
      <section className="game-shell">
        {devFinish ? (
          <button
            type="button"
            className="lobby-comic-btn dev-finish-btn"
            disabled={devFinish.pending}
            onClick={devFinish.onFinish}
          >
            <small>ALAT UJI</small>
            {devFinish.pending ? "Menyelesaikan..." : "Selesaikan permainan"}
          </button>
        ) : null}
        <header className="top-hud">
          <div className="brand-mark">
            <span>PU</span>
            <div><strong>Pejuang UMR</strong></div>
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
              {game.calendar.seasonHint}
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
            {activeFlow?.step === "pick" ? <InvitePickBanner onCancel={() => setInviteFlow(null)} /> : null}
            {game.phase === "reveal" && !revealPopupOpen ? (
              <button
                type="button"
                role="status"
                className="reveal-banner"
                aria-label="Buka kembali popup Fase Pembalikan"
                onClick={() => setMinimizedRevealEndsAt(null)}
              >
                <strong>Fase Pembalikan</strong>
                {latestRevealTile?.reality && latestReveal ? (
                  <span key={latestReveal.key} className={`reveal-result reveal-result-${latestRevealTile.reality.outcome}`}>
                    {getPlayerName(room, latestReveal.playerId)} · {OUTCOME_LABEL[latestRevealTile.reality.outcome]}: {latestRevealTile.reality.text}
                  </span>
                ) : (
                  <small>Realita dibuka sesuai urutan giliran</small>
                )}
              </button>
            ) : null}
            {revealPopupOpen ? (
              <RevealPopup rows={revealRows} onMinimize={() => setMinimizedRevealEndsAt(revealEndsAt)} />
            ) : null}
            {game.gold ? <div className="gold-badge">✦<strong>Petak<br />Emas</strong></div> : null}
            <GameBoard
              game={shownGame}
              room={room}
              lit={litOptions}
              reveal={revealProgress}
              inviteTargeting={inviteTargeting}
              onSelectHex={(key) => {
                if (resolveHexClick(key, litOptions, shownGame.openedHexes)) {
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
            {eventMessage ? <div className="event-toast" role="status">{eventMessage}</div> : null}
          </section>
          <Scoreboard game={game} room={room} playerId={me?.playerId ?? ""} pickTarget={inviteTargeting} />
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
              {pendingTurn ? <small>Pilih satu heksa yang menyala</small> : null}
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
      {popupGrid ? (
        <PopupGrid
          key={popupGrid.key}
          cards={popupCards}
          deadline={popupGrid.deadline}
          serverNow={serverNow}
          pending={actionPending}
          monthError={monthError}
          onDismissCard={(card) => {
            setDismissedCardIds((dismissed) => new Set(dismissed).add(card.id));
            if (card.kind === "doom") onDismissNotice(card.noticeId);
          }}
          onPayDebt={onPayDebt}
          onAnswerCalendar={onAnswerCalendar}
        />
      ) : null}
      <NoticeViews notices={notices} onDismiss={onDismissNotice} />
    </main>
  );
}
