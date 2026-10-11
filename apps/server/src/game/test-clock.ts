import type { Clock } from "./clock";

/** Jam palsu untuk tes: waktu hanya maju lewat advance(), dan jumlah timer tertunda bisa dicek. */
export class ManualClock implements Clock {
  private time = 1_000_000;
  private nextId = 1;
  private timers = new Map<number, { at: number; callback: () => void }>();

  now() {
    return this.time;
  }
  setTimeout(callback: () => void, ms: number) {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + ms, callback });
    return id;
  }
  clearTimeout(handle: unknown) {
    this.timers.delete(handle as number);
  }
  get pending() {
    return this.timers.size;
  }
  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.time = due[1].at;
      due[1].callback();
    }
    this.time = target;
  }
}
