import type { CalendarEventPayload, InviteCard } from "@pejuang/shared";
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Button from "../ui/Button";
import CalendarEventView from "./CalendarEventView";
import { InviteCardSheet, InviteConfirmSheet, InviteIncomingView, InvitePickBanner, InviteResultsView } from "./invites";

const card: InviteCard = {
  cardId: "card-1", plan: "hangout", planEffects: [], motive: "sincere", expiresAtMonth: 2,
};

describe("dialog event dan ajakan bergaya komik", () => {
  it("tombol Batal menjalankan callback keluar dari mode pilih", () => {
    const onCancel = vi.fn();
    const banner = InvitePickBanner({ onCancel });
    const button = (banner.props as { children: ReactNode[] }).children.find(
      (child) => isValidElement(child) && child.type === Button,
    ) as ReactElement<{ onClick: () => void }>;
    button.props.onClick();
    expect(onCancel).toHaveBeenCalledOnce();
  });
  it("memberi petunjuk dua cara memilih target dan tombol batal", () => {
    const markup = renderToStaticMarkup(createElement(InvitePickBanner, { onCancel: () => undefined }));
    expect(markup).toContain("Pilih pemain yang ingin diajak: klik karakternya di papan atau namanya di Papan Skor");
    expect(markup).toContain("ui-folder invite-pick-banner");
    expect(markup).toContain("Batal");
  });
  it("event menampilkan stempel, tanggal, radio native, centang, catatan dan tombol kirim", () => {
    const event = {
      version: 1, eventId: "event-1", name: "Kondangan Teman", dateLabel: "15 Mei", deadline: 10_000,
      choices: [{ id: "join", label: "Datang", note: "Biaya transport", effects: [] }],
    } satisfies CalendarEventPayload;
    const markup = renderToStaticMarkup(createElement(CalendarEventView, {
      event, pending: false, onAnswer: () => undefined,
    }));
    for (const text of ["Kondangan Teman", "EVENT TANGGAL", "15 Mei", "Pilih jawabanmu", "Datang", "Biaya transport", "Kirim jawaban"]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('type="radio"');
    expect(markup).toContain("comic-choice-check");
    expect(markup).toContain("ui-btn-primary");
  });

  it("keempat variasi Ajakan memakai kartu dan tombol komik tanpa mengganti teks", () => {
    const cardMarkup = renderToStaticMarkup(createElement(InviteCardSheet, {
      card, open: true, onPickTarget: () => undefined, onClose: () => undefined,
    }));
    expect(cardMarkup).toContain("Kartu Ajakan");
    expect(cardMarkup).toContain("Pilih target");
    expect(cardMarkup).toContain("comic-effect");
    expect(cardMarkup).toContain("ui-btn-outlined");

    const confirmMarkup = renderToStaticMarkup(createElement(InviteConfirmSheet, {
      flow: { step: "confirm", turnId: "turn-1", cardId: "card-1", targetPlayerId: "p2" },
      targetName: "Rina", plan: "hangout", pending: false,
      onConfirm: () => undefined, onCancel: () => undefined,
    }));
    expect(confirmMarkup).toContain("Konfirmasi Ajakan");
    expect(confirmMarkup).toContain("Ajak");
    expect(confirmMarkup).toContain("Batal");

    const popup = {
      invite: { inviteId: "inv-1", fromPlayerId: "p2", fromName: "Rina", plan: "hangout" as const, planEffects: [], deadline: 10_000 },
      secondsLeft: 8, compact: false,
    };
    const incomingMarkup = renderToStaticMarkup(createElement(InviteIncomingView, {
      popup, expired: false, pending: false, onRespond: () => undefined, onDismissExpired: () => undefined,
    }));
    expect(incomingMarkup).toContain("Ada ajakan buat kamu");
    expect(incomingMarkup).toContain("Sisa waktu menjawab: 8 detik");
    expect(incomingMarkup).toContain("comic-timer");
    expect(incomingMarkup).toContain("Ikut");
    expect(incomingMarkup).toContain("Tolak");
    const compactMarkup = renderToStaticMarkup(createElement(InviteIncomingView, {
      popup: { ...popup, compact: true }, expired: false, pending: false,
      onRespond: () => undefined, onDismissExpired: () => undefined,
    }));
    expect(compactMarkup).toContain("ui-folder ui-popup comic-dialog-compact");
    expect(compactMarkup).toContain("comic-timer");

    const resultMarkup = renderToStaticMarkup(createElement(InviteResultsView, {
      results: [{ inviteId: "inv-1", title: "Rina ikut", answerText: "Jawaban", motiveText: "Motif", effectsText: "Efek" }],
      onDismiss: () => undefined,
    }));
    expect(resultMarkup).toContain("Hasil Ajakan");
    expect(resultMarkup).toContain("Efek untukmu: Efek");
    expect(resultMarkup).toContain("Tutup");
  });
});