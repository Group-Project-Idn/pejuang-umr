import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("typography system", () => {
  it("memuat Fredoka, Nunito, dan Kalam sekali pada root layout", () => {
    expect(layout).toContain('import { Fredoka, Kalam, Nunito } from "next/font/google"');
    for (const font of ["fredoka", "nunito", "kalam"]) {
      expect(layout).toContain(`--font-${font}`);
      expect(layout).toContain(`\${${font}.variable}`);
    }
    expect(layout).not.toContain("Plus_Jakarta_Sans");
  });

  it("memetakan peran font di satu tema dan angka tabular pada Nunito", () => {
    expect(styles).toMatch(/--font-sans:\s*var\(--font-nunito\)/);
    expect(styles).toMatch(/--font-heading:\s*var\(--font-fredoka\)/);
    expect(styles).toMatch(/\.ui-stamp\s*\{[^}]*--font-kalam/);
    expect(styles).toMatch(/\.type-number\s*\{[^}]*--font-nunito[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(styles).toMatch(/\.ui-btn\s*\{[^}]*--font-fredoka/);
    expect(styles).toMatch(/\.ui-stamp\s*\{[^}]*--font-kalam/);
    expect(styles).not.toMatch(/--font-jakarta|font-family:\s*Georgia/i);
  });
});