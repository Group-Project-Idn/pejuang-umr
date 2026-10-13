import type { OpenedHex, TileOption } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  HEX_PANEL_CLASS,
  HEX_PANEL_WRAPPER_CLASS,
  isDragGesture,
  litInstanceToKey,
  selectHexFromClick,
  shouldShowHexFallback,
} from "./hex-interaction";

const option = (q: number, r: number, title: string): TileOption => ({
  hex: { q, r },
  title,
  category: "work",
  isGold: false,
  plan: [],
  risk: "low",
  riskTags: [],
} as unknown as TileOption);

const lit = [option(1, 0, "A"), option(0, 1, "B"), option(-1, 1, "C")];
const opened = [] as OpenedHex[];

describe("pemetaan instanceId litMesh", () => {
  it("memetakan indeks ke kunci heksa menyala", () => {
    expect(litInstanceToKey(0, lit)).toBe("1,0");
    expect(litInstanceToKey(2, lit)).toBe("-1,1");
  });
  it("indeks tak dikenal atau undefined menghasilkan null", () => {
    expect(litInstanceToKey(3, lit)).toBeNull();
    expect(litInstanceToKey(undefined, lit)).toBeNull();
  });
});

describe("klik yang bergeser", () => {
  it("pergeseran kecil tetap klik, besar diabaikan", () => {
    expect(isDragGesture({ x: 10, y: 10 }, { x: 12, y: 11 })).toBe(false);
    expect(isDragGesture({ x: 10, y: 10 }, { x: 40, y: 10 })).toBe(true);
    expect(isDragGesture(null, { x: 40, y: 10 })).toBe(false);
  });
  it("klik yang diseret tidak membuka detail", () => {
    expect(selectHexFromClick("1,0", true, lit, opened)).toBeNull();
    expect(selectHexFromClick("1,0", false, lit, opened)?.title).toBe("A");
  });
});

describe("panel detail non-modal", () => {
  it("klik heksa lain mengganti isi panel", () => {
    const first = selectHexFromClick("1,0", false, lit, opened);
    const second = selectHexFromClick("0,1", false, lit, opened);
    expect(first?.title).toBe("A");
    expect(second?.title).toBe("B");
    expect(second?.canChoose).toBe(true);
  });
  it("heksa tak menyala dan tak terbuka tidak membuka panel", () => {
    expect(selectHexFromClick("5,5", false, lit, opened)).toBeNull();
  });
  it("hanya panel yang menangkap pointer, lapisan luar tidak", () => {
    expect(HEX_PANEL_WRAPPER_CLASS).toContain("pointer-events-none");
    expect(HEX_PANEL_WRAPPER_CLASS).not.toMatch(/bg-black|inset-0/);
    expect(HEX_PANEL_CLASS).toContain("pointer-events-auto");
  });
});

describe("cadangan daftar heksa", () => {
  const base = { webgl: true, boardReady: true, boardFailed: false, litCount: 3, renderedLitCount: 3 };
  it("tidak tampil bila heksa tergambar", () => {
    expect(shouldShowHexFallback(base)).toBe(false);
  });
  it("tampil bila tak ada heksa tergambar atau papan gagal", () => {
    expect(shouldShowHexFallback({ ...base, renderedLitCount: 0 })).toBe(true);
    expect(shouldShowHexFallback({ ...base, boardReady: false, boardFailed: true })).toBe(true);
  });
  it("tidak tampil sebelum papan siap, tanpa giliran, atau tanpa WebGL", () => {
    expect(shouldShowHexFallback({ ...base, boardReady: false, renderedLitCount: 0 })).toBe(false);
    expect(shouldShowHexFallback({ ...base, litCount: 0, renderedLitCount: 0 })).toBe(false);
    expect(shouldShowHexFallback({ ...base, webgl: false, renderedLitCount: 0 })).toBe(false);
  });
});
