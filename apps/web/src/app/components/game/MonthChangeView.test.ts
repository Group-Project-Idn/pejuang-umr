import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MonthSummaryPayload } from "@pejuang/shared";
import MonthChangeView, {
  DEBT_CLEARED_NOTICE,
  DEBT_SLIDER_STEP,
  DEBT_UNAFFORDABLE_TEXT,
  debtPositionToAmount,
  getDebtSliderPositions,
  getMonthPaymentSeconds,
  getPayDebtErrorMessage,
} from "./MonthChangeView";

describe("timer Ganti Bulan", () => {
  it("menggunakan jam server dan berhenti pada tenggat", () => {
    expect(getMonthPaymentSeconds(15_000, 0)).toBe(15);
    expect(getMonthPaymentSeconds(15_000, 14_001)).toBe(1);
    expect(getMonthPaymentSeconds(15_000, 15_000)).toBe(0);
    expect(getMonthPaymentSeconds(15_000, 16_000)).toBe(0);
  });
});

describe("ringkasan Ganti Bulan setelah reconnect", () => {
  it.each([0, 500_000, 1_000_000])("tidak menyatakan hutang lunas saat sisa hutang Rp%s dan aksi pembayaran sudah selesai", (debt) => {
    const status: MonthSummaryPayload["after"] = { wealth: 5_000_000, debt, debtLimit: 25_000_000, health: 7, stress: 2 };
    const summary: MonthSummaryPayload = {
      month: 2, salary: 5_730_000, livingCost: 4_600_000,
      interest: 30_000, interestAddedToDebt: 0,
      before: { ...status, debt: 1_000_000 }, after: status, payDebt: null,
    };
    const markup = renderToStaticMarkup(createElement(MonthChangeView, {
      summary, pending: false, serverClockOffsetMs: 0, onPayDebt: () => undefined,
    }));
    expect(markup).toContain("Menunggu proses Ganti Bulan selesai");
    expect(markup).not.toContain("Tidak ada hutang");
    expect(markup).not.toContain('type="range"');
  });
});
const baseStatus: MonthSummaryPayload["after"] = { wealth: 0, debt: 1_000_000, debtLimit: 25_000_000, health: 7, stress: 2 };
const debtSummary = (max: number): MonthSummaryPayload => ({
  month: 2, salary: 5_730_000, livingCost: 4_600_000, interest: 30_000, interestAddedToDebt: 0,
  before: baseStatus, after: baseStatus, payDebt: { max, deadline: Date.now() + 15_000 },
});
const render = (summary: MonthSummaryPayload, error?: string) =>
  renderToStaticMarkup(createElement(MonthChangeView, {
    summary, pending: false, serverClockOffsetMs: 0, error, onPayDebt: () => undefined,
  }));

describe("Bayar Hutang saat Kekayaan tidak cukup", () => {
  it("menonaktifkan slider, menampilkan teks, dan tombol Lewati", () => {
    const markup = render(debtSummary(0));
    expect(markup).toContain(DEBT_UNAFFORDABLE_TEXT);
    expect(markup).toContain("Kekayaanmu belum cukup untuk mencicil");
    expect(markup).toMatch(/<input[^>]*type="range"[^>]*disabled/);
    expect(markup).toContain("Lewati");
    expect(markup).not.toContain("Konfirmasi pembayaran");
  });

  it("memakai tombol Konfirmasi saat max lebih dari 0", () => {
    const markup = render(debtSummary(120_000));
    expect(markup).toContain("Konfirmasi pembayaran");
    expect(markup).not.toContain("Lewati");
    expect(markup).not.toContain(DEBT_UNAFFORDABLE_TEXT);
  });
});

describe("slider Bayar Hutang", () => {
  it("melangkah Rp50.000 dan tetap bisa memilih nilai maksimum", () => {
    expect(DEBT_SLIDER_STEP).toBe(50_000);
    expect(getDebtSliderPositions(120_000)).toBe(3);
    expect(debtPositionToAmount(0, 120_000)).toBe(0);
    expect(debtPositionToAmount(1, 120_000)).toBe(50_000);
    expect(debtPositionToAmount(2, 120_000)).toBe(100_000);
    expect(debtPositionToAmount(3, 120_000)).toBe(120_000);
    expect(getDebtSliderPositions(100_000)).toBe(2);
    expect(debtPositionToAmount(2, 100_000)).toBe(100_000);
    expect(getDebtSliderPositions(0)).toBe(0);
    expect(debtPositionToAmount(0, 0)).toBe(0);
  });
});

describe("pesan pembayaran hutang", () => {
  it("memakai teks API_CONTRACT Bagian 15", () => {
    expect(getPayDebtErrorMessage("PAYMENT_CLOSED")).toBe("Waktu habis, Hutang tidak dibayar bulan ini.");
    expect(getPayDebtErrorMessage("INVALID_PAYLOAD")).toBe("Ada yang salah. Coba lagi.");
    expect(getPayDebtErrorMessage("INTERNAL")).toBe("Server lagi bermasalah. Coba lagi.");
    expect(DEBT_CLEARED_NOTICE).toBe("Hutang lunas! Level Stress -2");
  });

  it("menampilkan galat di dalam popup", () => {
    expect(render(debtSummary(100_000), "Ada yang salah. Coba lagi.")).toContain("Ada yang salah. Coba lagi.");
  });
});

describe("nota Ganti Bulan bergaya komik", () => {
  it("mempertahankan rincian, tanda nominal, timer dan satu tombol utama", () => {
    const markup = render({ ...debtSummary(120_000), interestAddedToDebt: 30_000 });
    for (const text of ["Ganti Bulan", "Bulan 2", "Gaji masuk", "Biaya hidup wajib", "Bunga hutang", "Bunga menjadi hutang", "Kekayaan baru", "Hutang baru", "Bayar hutang:", "Waktu tersisa:", "Konfirmasi pembayaran"]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain("comic-receipt-total");
    expect(markup).toContain("comic-amount-positive\">+Rp");
    expect(markup).toContain("comic-amount-negative\">−Rp");
    expect(markup).toContain('class="comic-debt-slider"');
    expect(markup.match(/ui-btn-primary/g)).toHaveLength(1);
  });

  it("menampilkan galat dalam kotak koral tanpa mengubah pesannya", () => {
    const markup = render(debtSummary(120_000), "Ada yang salah. Coba lagi.");
    expect(markup).toContain('role="alert" class="comic-error"');
    expect(markup).toContain("Ada yang salah. Coba lagi.");
  });
});
