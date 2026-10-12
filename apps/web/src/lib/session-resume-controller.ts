import type { Ack, Snapshot } from "@pejuang/shared";
import { createSingleFlightGate } from "./room-session-view";

type ResumeResponse = Ack<{ snapshot: Snapshot }>;

export type SessionResumeControllerOptions = {
  isConnected: () => boolean;
  getPrivateRevision: () => number;
  send: (
    callback: (error: Error | null, response: ResumeResponse) => void,
  ) => void;
  onStart: () => void;
  onTransportError: () => void;
  onRejected: (response: Extract<ResumeResponse, { ok: false }>) => void;
  onSnapshot: (snapshot: Snapshot, privateRevisionAtRequest: number) => boolean;
};

/** Mengatur recovery session agar tetap single-flight dan aman setelah cleanup. */
export function createSessionResumeController(
  options: SessionResumeControllerOptions,
) {
  const gate = createSingleFlightGate();
  let active = true;

  const scheduleRetry = () => {
    queueMicrotask(() => {
      if (active && options.isConnected()) request();
    });
  };

  const request = () => {
    if (!active || !options.isConnected() || !gate.tryStart()) return;
    const privateRevisionAtRequest = options.getPrivateRevision();
    options.onStart();
    options.send((error, response) => {
      const retryRequested = gate.finish();
      if (!active) return;

      if (error) {
        options.onTransportError();
        if (retryRequested) scheduleRetry();
        return;
      }
      if (!response.ok) {
        options.onRejected(response);
        return;
      }

      const snapshotAccepted = options.onSnapshot(
        response.snapshot,
        privateRevisionAtRequest,
      );
      if (retryRequested || !snapshotAccepted) scheduleRetry();
    });
  };

  return {
    request,
    dispose() {
      active = false;
    },
  };
}