import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForSocketConnection } from "./socket";

type ConnectionEvent = "connect" | "connect_error";

function createFakeSocket(connected = false) {
  const listeners = new Map<ConnectionEvent, () => void>();
  return {
    connected,
    connect: vi.fn(),
    once: vi.fn((event: ConnectionEvent, handler: () => void) => {
      listeners.set(event, handler);
      return socket;
    }),
    off: vi.fn((event: ConnectionEvent, handler: () => void) => {
      if (listeners.get(event) === handler) listeners.delete(event);
      return socket;
    }),
    emitLocal(event: ConnectionEvent) {
      listeners.get(event)?.();
    },
  };
  function socket() {
    return undefined;
  }
}

describe("koneksi Socket.IO", () => {
  afterEach(() => vi.useRealTimers());

  it("langsung selesai jika socket sudah terhubung", async () => {
    const socket = createFakeSocket(true);
    await expect(waitForSocketConnection(socket as never)).resolves.toBe(socket);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it("menyelesaikan koneksi dan membersihkan listener", async () => {
    const socket = createFakeSocket();
    const connection = waitForSocketConnection(socket as never);
    socket.emitLocal("connect");

    await expect(connection).resolves.toBe(socket);
    expect(socket.connect).toHaveBeenCalledOnce();
    expect(socket.off).toHaveBeenCalledTimes(2);
  });

  it("gagal setelah timeout agar UI tidak terus sibuk", async () => {
    vi.useFakeTimers();
    const socket = createFakeSocket();
    const connection = waitForSocketConnection(socket as never, 500);
    const assertion = expect(connection).rejects.toThrow("HEALTH_CHECK_FAILED");

    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    expect(socket.off).toHaveBeenCalledTimes(2);
  });
});