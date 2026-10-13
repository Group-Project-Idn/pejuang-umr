import { describe, expect, it } from "vitest";
import { readServerConfig } from "./config";

describe("readServerConfig", () => {
  it("menolak start di production jika GUEST_TOKEN_SECRET kosong", () => {
    expect(() =>
      readServerConfig({ NODE_ENV: "production", GUEST_TOKEN_SECRET: "" }),
    ).toThrow(/GUEST_TOKEN_SECRET/);
  });

  it("menolak start di production jika GUEST_TOKEN_SECRET masih placeholder", () => {
    expect(() =>
      readServerConfig({
        NODE_ENV: "production",
        GUEST_TOKEN_SECRET: "change-me",
      }),
    ).toThrow(/GUEST_TOKEN_SECRET/);
  });

  it("mengizinkan placeholder change-me di luar production", () => {
    const config = readServerConfig({
      GUEST_TOKEN_SECRET: "change-me",
    });
    expect(config.guestTokenSecret).toBe("change-me");
  });

  it("menerima secret valid di production", () => {
    const valid = "a".repeat(40);
    const config = readServerConfig({
      NODE_ENV: "production",
      GUEST_TOKEN_SECRET: valid,
    });
    expect(config.guestTokenSecret).toBe(valid);
  });

  it("S1: port default 3002, sama dengan .env.example dan CI", () => {
    const config = readServerConfig({ GUEST_TOKEN_SECRET: "change-me" });
    expect(config.port).toBe(3002);
    expect(readServerConfig({ PORT: "8080" }).port).toBe(8080);
  });

  it("M11: ROOM_IDLE_MS default 600000 dan ROOM_EMPTY_MS default 120000, bisa diatur", () => {
    const config = readServerConfig({ GUEST_TOKEN_SECRET: "change-me" });
    expect(config.roomIdleMs).toBe(600_000);
    expect(config.roomEmptyMs).toBe(120_000);
    expect(readServerConfig({ ROOM_IDLE_MS: "1000", ROOM_EMPTY_MS: "500" })).toMatchObject({
      roomIdleMs: 1000,
      roomEmptyMs: 500,
    });
    expect(() => readServerConfig({ ROOM_IDLE_MS: "abc" })).toThrow(/ROOM_IDLE_MS/);
  });

  it("REVEAL_STEP_MS, MONTH_PAY_SECONDS, MONTH_SUMMARY_ONLY_MS: default 2500/15/3000, bisa diatur", () => {
    const config = readServerConfig({ GUEST_TOKEN_SECRET: "change-me" });
    expect(config.revealStepMs).toBe(2_500);
    expect(config.monthPaySeconds).toBe(15);
    expect(config.monthSummaryOnlyMs).toBe(3_000);
    expect(
      readServerConfig({ REVEAL_STEP_MS: "100", MONTH_PAY_SECONDS: "3", MONTH_SUMMARY_ONLY_MS: "50" }),
    ).toMatchObject({ revealStepMs: 100, monthPaySeconds: 3, monthSummaryOnlyMs: 50 });
    expect(() => readServerConfig({ REVEAL_STEP_MS: "abc" })).toThrow(/REVEAL_STEP_MS/);
    expect(() => readServerConfig({ MONTH_PAY_SECONDS: "0" })).toThrow(/MONTH_PAY_SECONDS/);
    expect(() => readServerConfig({ MONTH_SUMMARY_ONLY_MS: "-5" })).toThrow(/MONTH_SUMMARY_ONLY_MS/);
  });

  it("REFLECTION_PROVIDER default none, fake hanya di luar production; REFLECTION_TIMEOUT_MS default 15000", () => {
    const config = readServerConfig({ GUEST_TOKEN_SECRET: "change-me" });
    expect(config.reflectionProvider).toBe("none");
    expect(config.reflectionTimeoutMs).toBe(15_000);
    expect(readServerConfig({ REFLECTION_PROVIDER: "fake", REFLECTION_TIMEOUT_MS: "250" })).toMatchObject({
      reflectionProvider: "fake",
      reflectionTimeoutMs: 250,
    });
    expect(() =>
      readServerConfig({ NODE_ENV: "production", GUEST_TOKEN_SECRET: "a".repeat(40), REFLECTION_PROVIDER: "fake" }),
    ).toThrow(/REFLECTION_PROVIDER/);
    expect(() => readServerConfig({ REFLECTION_PROVIDER: "openai" })).toThrow(/REFLECTION_PROVIDER/);
    expect(() => readServerConfig({ REFLECTION_TIMEOUT_MS: "0" })).toThrow(/REFLECTION_TIMEOUT_MS/);
  });

  it("DEV_TOOLS default false, true hanya di luar production, nilai lain ditolak", () => {
    expect(readServerConfig({ GUEST_TOKEN_SECRET: "change-me" }).devTools).toBe(false);
    expect(readServerConfig({ DEV_TOOLS: "false" }).devTools).toBe(false);
    expect(readServerConfig({ DEV_TOOLS: "true" }).devTools).toBe(true);
    expect(() =>
      readServerConfig({ NODE_ENV: "production", GUEST_TOKEN_SECRET: "a".repeat(40), DEV_TOOLS: "true" }),
    ).toThrow(/DEV_TOOLS/);
    expect(
      readServerConfig({ NODE_ENV: "production", GUEST_TOKEN_SECRET: "a".repeat(40) }).devTools,
    ).toBe(false);
    expect(() => readServerConfig({ DEV_TOOLS: "yes" })).toThrow(/DEV_TOOLS/);
  });
});
