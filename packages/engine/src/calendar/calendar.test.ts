import { describe, expect, it } from "vitest";
import { CalendarInfoSchema } from "@pejuang/shared";
import {
  getCalendarEventAtStep,
  getCalendarInfo,
  getSeasonChange,
  SEASON_HINT,
} from "./calendar";

describe("getCalendarInfo", () => {
  it("seasonHint mengikuti musim langkah itu, di semua langkah", () => {
    for (let step = 1; step <= 24; step += 1) {
      const info = getCalendarInfo(step);
      expect(info.seasonHint).toBe(SEASON_HINT[info.season]);
      expect(CalendarInfoSchema.safeParse(info).success).toBe(true);
    }
  });

  it("langkah 1: 1 Jan, Bulan 1, rainy, Lebaran 5 langkah lagi", () => {
    const info = getCalendarInfo(1);
    expect(info.dateLabel).toBe("1 Jan");
    expect(info.month).toBe(1);
    expect(info.season).toBe("rainy");
    expect(info.round).toBe(1);
    expect(info.totalSteps).toBe(24);
    expect(info.nextEvent).toEqual({ name: "Lebaran & THR", stepsLeft: 5 });
  });

  it("langkah 10 adalah 15 Mei", () => {
    expect(getCalendarInfo(10).dateLabel).toBe("15 Mei");
  });

  it("langkah 16 adalah Bulan 8, dry", () => {
    const info = getCalendarInfo(16);
    expect(info.month).toBe(8);
    expect(info.season).toBe("dry");
  });

  it("langkah 24 adalah 15 Des tanpa event berikutnya", () => {
    const info = getCalendarInfo(24);
    expect(info.dateLabel).toBe("15 Des");
    expect(info.nextEvent).toBeNull();
  });

  it("event di langkah ini tidak dihitung sebagai berikutnya", () => {
    expect(getCalendarInfo(6).nextEvent?.stepsLeft).toBe(3);
  });

  it("lolos CalendarInfoSchema di semua langkah", () => {
    for (let step = 1; step <= 24; step++) {
      expect(() => CalendarInfoSchema.parse(getCalendarInfo(step))).not.toThrow();
    }
  });
});

describe("getSeasonChange", () => {
  it("mengembalikan musim saat berganti atau di langkah 1", () => {
    expect(getSeasonChange(1)).toBe("rainy");
    expect(getSeasonChange(5)).toBe("transition");
    expect(getSeasonChange(11)).toBe("dry");
  });

  it("mengembalikan null jika musim tidak berubah", () => {
    expect(getSeasonChange(2)).toBeNull();
    expect(getSeasonChange(6)).toBeNull();
  });
});

describe("getCalendarEventAtStep", () => {
  const EVENT_STEPS = [1, 6, 9, 12, 16, 21];

  it("mengembalikan event tepat di langkahnya", () => {
    for (const step of EVENT_STEPS) {
      expect(getCalendarEventAtStep(step)?.multiplayerStep).toBe(step);
    }
  });

  it("mengembalikan null di langkah lain", () => {
    for (let step = 1; step <= 24; step++) {
      if (!EVENT_STEPS.includes(step)) {
        expect(getCalendarEventAtStep(step)).toBeNull();
      }
    }
  });
});
