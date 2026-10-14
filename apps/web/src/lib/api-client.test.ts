import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({ getServerUrl: () => "http://localhost:3002" }));

import { lookupRoom } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("lookupRoom", () => {
  it("menerima room uji kosong yang joinable tanpa membuat asumsi room sudah ada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true, code: "UMR-0099", status: "waiting", playerCount: 0,
        maxPlayers: 4, joinable: true, reason: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(lookupRoom("UMR-0099", "token-test")).resolves.toMatchObject({
      code: "UMR-0099", playerCount: 0, joinable: true,
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3002/api/v1/rooms/UMR-0099", {
      cache: "no-store", headers: { authorization: "Bearer token-test" },
    });
  });

  it("mempertahankan ROOM_NOT_FOUND hanya jika server mengirim kode itu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, error: "ROOM_NOT_FOUND" }),
    }));
    await expect(lookupRoom("UMR-0099")).rejects.toThrow("ROOM_NOT_FOUND");
  });

  it("tidak mengubah respons error tanpa kode menjadi ROOM_NOT_FOUND", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ message: "upstream gagal" }),
    }));
    await expect(lookupRoom("UMR-0099")).rejects.toThrow("INTERNAL");
  });
});