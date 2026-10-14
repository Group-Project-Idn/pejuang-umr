import { describe, expect, it, vi } from "vitest";
import { joinRoomByCode } from "./join-room";

const emptyRoom = {
  ok: true as const, code: "UMR-0099", status: "waiting" as const,
  playerCount: 0, maxPlayers: 4 as const, joinable: true, reason: null,
};

function setup(ack: { ok: true } | { ok: false; error: "ROOM_NOT_FOUND" } = { ok: true }) {
  const emit = vi.fn((_event, _payload, callback) => callback(null, ack));
  const timeout = vi.fn(() => ({ emit }));
  const lookupRoom = vi.fn().mockResolvedValue(emptyRoom);
  const connectGameSocket = vi.fn().mockResolvedValue({ timeout });
  const onJoining = vi.fn();
  const deps = { lookupRoom, connectGameSocket, onJoining } as unknown as Parameters<typeof joinRoomByCode>[2];
  return { deps, lookupRoom, connectGameSocket, onJoining, emit, timeout };
}

describe("join dari Lobby", () => {
  it("lookup room kosong lalu join pertama; kode dinormalisasi sebelum dikirim", async () => {
    const { deps, lookupRoom, connectGameSocket, onJoining, emit, timeout } = setup();
    await expect(joinRoomByCode(" umr-0099 ", "token-test", deps))
      .resolves.toEqual({ ok: true, code: "UMR-0099" });
    expect(lookupRoom).toHaveBeenCalledWith("UMR-0099", "token-test");
    expect(connectGameSocket).toHaveBeenCalledWith("token-test");
    expect(onJoining).toHaveBeenCalledOnce();
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(emit).toHaveBeenCalledWith("room:join", {
      requestId: expect.any(String), roomCode: "UMR-0099",
    }, expect.any(Function));
    expect(lookupRoom.mock.invocationCallOrder[0]).toBeLessThan(connectGameSocket.mock.invocationCallOrder[0]!);
  });

  it("format salah tidak mengakses server", async () => {
    const { deps, lookupRoom, connectGameSocket } = setup();
    await expect(joinRoomByCode("UMR-99", "token-test", deps))
      .resolves.toEqual({ ok: false, error: "INVALID_PAYLOAD" });
    expect(lookupRoom).not.toHaveBeenCalled();
    expect(connectGameSocket).not.toHaveBeenCalled();
  });

  it("lookup 404 berhenti sebelum koneksi dan join", async () => {
    const { deps, lookupRoom, connectGameSocket, emit } = setup();
    lookupRoom.mockRejectedValue(new Error("ROOM_NOT_FOUND"));
    await expect(joinRoomByCode("UMR-0099", "token-test", deps))
      .resolves.toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
    expect(connectGameSocket).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("room terkunci tidak dikirim ke socket", async () => {
    const { deps, lookupRoom, connectGameSocket } = setup();
    lookupRoom.mockResolvedValue({ ...emptyRoom, joinable: false, reason: "ROOM_LOCKED" });
    await expect(joinRoomByCode("UMR-0099", "token-test", deps))
      .resolves.toEqual({ ok: false, error: "ROOM_LOCKED" });
    expect(connectGameSocket).not.toHaveBeenCalled();
  });

  it("ACK join gagal setelah lookup sukses tidak menghasilkan navigasi sukses", async () => {
    const { deps } = setup({ ok: false, error: "ROOM_NOT_FOUND" });
    await expect(joinRoomByCode("UMR-0099", "token-test", deps))
      .resolves.toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
  });

  it("timeout join dan gangguan koneksi tidak dianggap room tidak ditemukan", async () => {
    const { deps, connectGameSocket } = setup();
    connectGameSocket.mockRejectedValue(new Error("HEALTH_CHECK_FAILED"));
    await expect(joinRoomByCode("UMR-0099", "token-test", deps))
      .resolves.toEqual({ ok: false, error: "HEALTH_CHECK_FAILED" });
    const timedOut = setup();
    timedOut.emit.mockImplementation((_event, _payload, callback) => callback(new Error("timeout")));
    await expect(joinRoomByCode("UMR-0099", "token-test", timedOut.deps))
      .resolves.toEqual({ ok: false, error: "HEALTH_CHECK_FAILED" });
  });
});