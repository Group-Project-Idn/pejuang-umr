import { describe, expect, it, vi } from "vitest";
import { createSessionResumeController } from "./session-resume-controller";

describe("session resume controller", () => {
  it("mengulang sekali setelah reconnect ketika request lama timeout", async () => {
    let connected = true;
    const callbacks: Array<(error: Error | null, response: never) => void> = [];
    const send = vi.fn((callback: (error: Error | null, response: never) => void) => {
      callbacks.push(callback);
    });
    const controller = createSessionResumeController({
      isConnected: () => connected,
      getPrivateRevision: () => 0,
      send,
      onStart: vi.fn(),
      onTransportError: vi.fn(),
      onRejected: vi.fn(),
      onSnapshot: vi.fn(() => true),
    });

    controller.request();
    connected = false;
    connected = true;
    controller.request();
    expect(send).toHaveBeenCalledTimes(1);

    callbacks[0]!(new Error("timeout"), undefined as never);
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(2);

    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("tidak retry setelah cleanup atau saat masih disconnected", async () => {
    let connected = true;
    let callback: ((error: Error | null, response: never) => void) | undefined;
    const send = vi.fn((next: (error: Error | null, response: never) => void) => {
      callback = next;
    });
    const controller = createSessionResumeController({
      isConnected: () => connected,
      getPrivateRevision: () => 0,
      send,
      onStart: vi.fn(),
      onTransportError: vi.fn(),
      onRejected: vi.fn(),
      onSnapshot: vi.fn(() => true),
    });

    controller.request();
    controller.request();
    connected = false;
    callback!(new Error("timeout"), undefined as never);
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);

    connected = true;
    controller.request();
    controller.request();
    controller.dispose();
    callback!(new Error("timeout"), undefined as never);
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(2);
  });
});