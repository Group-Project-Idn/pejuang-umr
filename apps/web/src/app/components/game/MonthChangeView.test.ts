import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MonthSummaryPayload } from "@pejuang/shared";
import MonthChangeView, { getMonthPaymentSeconds } from "./MonthChangeView";

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