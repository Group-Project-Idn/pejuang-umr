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
});
