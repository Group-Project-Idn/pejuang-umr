export type TimerHandle = unknown;

/** Sumber waktu dan timer yang disuntikkan, supaya tes bisa mengendalikan waktu. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

/** Memanggil global saat dipakai, sehingga vi.useFakeTimers() ikut berlaku. */
export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};
