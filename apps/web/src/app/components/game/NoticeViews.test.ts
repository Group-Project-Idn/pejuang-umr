import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NoticeViews, {
  getCalendarResultLines,
  getDoomLines,
  NOTICE_AUTO_DISMISS_MS,
} from "./NoticeViews";

const doom = { amount: 750_000, round: 3, stressAfter: 8 };
const result = {
  eventId: "e1", choice: "joinPaylater" as const, autoChosen: false,
  effects: [{ stat: "wealth" as const, delta: -500_000 }], flavor: "Barang tidak sesuai",
};
const render = (notices: Parameters<typeof NoticeViews>[0]["notices"]) =>
  renderToStaticMarkup(createElement(NoticeViews, { notices, onDismiss: () => undefined }));

describe("pemberitahuan sementara", () => {
  it("hilang sendiri setelah 4 detik", () => {
    expect(NOTICE_AUTO_DISMISS_MS).toBe(4_000);
  });

  it("kalimat Doom memuat nominal dan Level Stress; kartunya tampil di PopupGrid, bukan overlay", () => {
    expect(getDoomLines(doom)).toEqual([
      "Checkout dulu, nyesel belakangan.",
      "Kekayaan -Rp750.000",
      "Level Stress sekarang 8",
    ]);
    expect(render([{ id: 1, kind: "doom", payload: doom }])).toBe("");
  });

  it("toast hasil Event Tanggal memuat pilihan, efek, dan flavor", () => {
    expect(getCalendarResultLines(result)).toEqual([
      "Pilihanmu: Ikut dengan Paylater",
      "Efek: Kekayaan -Rp500.000",
      "Barang tidak sesuai",
    ]);
    const markup = render([{ id: 2, kind: "calendarResult", payload: result }]);
    expect(markup).toContain("Barang tidak sesuai");
  });

  it("menandai pilihan otomatis dan melewatkan flavor kosong", () => {
    const lines = getCalendarResultLines({ ...result, choice: "skip", autoChosen: true, effects: [], flavor: undefined });
    expect(lines).toEqual(["Pilihanmu: Tidak ikut (otomatis, waktu habis)", "Efek: Tanpa efek"]);
  });

  it("tidak merender apa pun tanpa pemberitahuan", () => {
    expect(render([])).toBe("");
  });
});
