import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MonthSummaryPayload } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import type { PopupCard } from "@/lib/popup-cards";
import PopupGrid from "./PopupGrid";

const status = { wealth: 5_000_000, debt: 1_000_000, debtLimit: 25_000_000 as const, health: 7, stress: 2 };
const summary = (payDebt: MonthSummaryPayload["payDebt"]): MonthSummaryPayload => ({
  month: 2, salary: 5_730_000, livingCost: 5_200_000, passiveStress: 1, interest: 0, interestAddedToDebt: 0,
  batchId: "b1", deadline: 15_000, before: status, after: status, payDebt,
});
const decisionCards: PopupCard[] = [
  { id: "b1:month", kind: "month", needsDecision: true, summary: summary({ max: 100_000 }) },
  { id: "b1:calendar", kind: "calendar", needsDecision: true, event: {
    version: 1, batchId: "b1", eventId: "e1", name: "Kondangan", dateLabel: "15 Mei", deadline: 15_000,
    choices: [{ id: "skip", label: "Tidak ikut", effects: [] }],
  } },
];
const infoCards: PopupCard[] = [
  { id: "b1:season", kind: "season", needsDecision: false, season: "dry", hint: "Kemarau: petak Kerja lebih rawan" },
  { id: "b1:burden", kind: "burden", needsDecision: false },
];
const render = (cards: PopupCard[], serverNow = 0) => renderToStaticMarkup(createElement(PopupGrid, {
  cards, deadline: 15_000, serverNow, pending: false,
  onDismissCard: () => undefined, onPayDebt: () => undefined, onAnswerCalendar: () => undefined,
}));

describe("PopupGrid", () => {
  it("satu kartu per popup dengan satu cincin hitung mundur bersama", () => {
    const markup = render([...decisionCards, ...infoCards]);
    expect(markup.match(/role="dialog"/g)).toHaveLength(4);
    expect(markup.match(/role="timer"/g)).toHaveLength(1);
    expect(markup).toContain("Sisa waktu popup: 15 detik");
    expect(markup).not.toContain("Waktu tersisa");
  });

  it("kartu keputusan bertag dan tanpa X", () => {
    const markup = render(decisionCards);
    expect(markup.match(/Butuh keputusanmu!/g)).toHaveLength(2);
    expect(markup).not.toContain('aria-label="Tutup"');
  });

  it("kartu informasi punya X dengan aria-label Tutup dan tanpa tag", () => {
    const markup = render(infoCards);
    expect(markup.match(/aria-label="Tutup"/g)).toHaveLength(2);
    expect(markup).not.toContain("Butuh keputusanmu!");
    expect(markup).toContain("Musim berganti");
    expect(markup).toContain("Beban Peringkat 1");
  });

  it("campuran: hanya kartu informasi yang punya X", () => {
    const markup = render([decisionCards[0], infoCards[0]]);
    expect(markup.match(/aria-label="Tutup"/g)).toHaveLength(1);
    expect(markup.match(/Butuh keputusanmu!/g)).toHaveLength(1);
  });

  it("tanpa kartu tidak merender apa pun", () => {
    expect(render([])).toBe("");
  });

  it("setelah deadline, kontrol keputusan dinonaktifkan", () => {
    expect(render(decisionCards, 15_000)).toMatch(/<button[^>]*disabled[^>]*>(Konfirmasi pembayaran|Kirim jawaban)/);
  });
});
