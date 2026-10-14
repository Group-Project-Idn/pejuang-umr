import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalendarInfo } from "@pejuang/shared";
import CalendarCard from "./CalendarCard";

const calendar: CalendarInfo = {
  step: 8, totalSteps: 24, round: 4, month: 4,
  dateLabel: "April · Pekan 2", season: "transition",
  seasonHint: "Pancaroba: petak Kesehatan lebih rawan dan keterangan panjang tetap utuh",
  nextEvent: null,
};

describe("kalender musim", () => {
  it("hint utuh berada setelah nama musim di blok musim, bukan di bawah tanggal", () => {
    const markup = renderToStaticMarkup(<CalendarCard calendar={calendar} />);
    const date = markup.match(/<div class="calendar-date">([\s\S]*?)<\/div>/)?.[1] ?? "";
    const weather = markup.match(/<div class="weather">([\s\S]*?)<\/div>/)?.[1] ?? "";
    expect(date).toContain(calendar.dateLabel);
    expect(date).toContain("Langkah 8/24");
    expect(date).not.toContain(calendar.seasonHint);
    expect(weather).toContain("Pancaroba");
    expect(weather).toContain(calendar.seasonHint);
    expect(weather.indexOf("Pancaroba")).toBeLessThan(weather.indexOf(calendar.seasonHint));
    for (const season of ["rainy", "dry", "transition"] as const) {
      const result = renderToStaticMarkup(<CalendarCard calendar={{ ...calendar, season }} />);
      expect(result).toContain(calendar.seasonHint);
    }
  });

  it("CSS tidak memangkas hint dan menampilkan Kamus Petak pada mobile", () => {
    const css = readFileSync(resolve("src/app/globals.css"), "utf8");
    expect(css).not.toMatch(/\.season-hint\s*\{[^}]*-webkit-line-clamp/);
    expect(css).toMatch(/\.season-hint\s*\{[^}]*overflow-wrap:/);
    expect(css).not.toMatch(/\.tile-legend\s*,\s*\.gold-note\s*\{\s*display:\s*none/);
    expect(css).toMatch(/@media \(max-width:760px\)[^\n]*\.tile-legend\s*\{\s*position:\s*static/);
  });
});