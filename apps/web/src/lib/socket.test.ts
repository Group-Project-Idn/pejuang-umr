import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForSocketConnection } from "./socket";

type ConnectionEvent = "connect" | "connect_error";

function createFakeSocket(connected = false) {
  const listeners = new Map<ConnectionEvent, (error?: Error) => void>();
  const socket = {
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
    emitLocal(event: ConnectionEvent, error?: Error) {
      listeners.get(event)?.(error);
    },
  };
  return socket;
}

describe("koneksi Socket.IO", () => {
  afterEach(() => vi.useRealTimers());

  it("mempertahankan UNAUTHORIZED agar UI bisa menghapus sesi kedaluwarsa", async () => {
    vi.useFakeTimers();
    const socket = createFakeSocket();
    const connection = waitForSocketConnection(socket as never);
    socket.emitLocal("connect_error", new Error("UNAUTHORIZED"));
    await expect(connection).rejects.toThrow("UNAUTHORIZED");
    expect(socket.off).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

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

  it("menolak connect_error, membersihkan timer, lalu dapat dicoba lagi", async () => {
    vi.useFakeTimers();
    const socket = createFakeSocket();
    const failedConnection = waitForSocketConnection(socket as never, 500);

    socket.emitLocal("connect_error");

    await expect(failedConnection).rejects.toThrow("HEALTH_CHECK_FAILED");
    expect(socket.off).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);

    const retry = waitForSocketConnection(socket as never, 500);
    socket.emitLocal("connect");

    await expect(retry).resolves.toBe(socket);
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(socket.off).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });
});