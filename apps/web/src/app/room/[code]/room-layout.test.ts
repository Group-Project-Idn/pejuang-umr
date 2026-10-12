import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");

describe("tampilan ruang tunggu", () => {
  it("menata room desktop menjadi panel ringkas dua kolom", () => {
    expect(styles).toContain("@media (min-width: 621px)");
    expect(styles).toMatch(/\.room-content-grid\s*\{[^}]*grid-template-columns:\s*minmax\(190px,\s*0\.38fr\)\s+minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.room-folder\s*\{[^}]*min-height:\s*clamp\(340px,\s*calc\(100dvh - 115px\),\s*560px\);/);
    expect(styles).toMatch(/\.room-player-card\s*\{[^}]*min-height:\s*clamp\(96px,\s*13vh,\s*126px\);/);
  });

  it("mengalihkan layar sempit menjadi susunan satu kolom", () => {
    expect(styles).toContain("@media (max-width: 700px)");
    expect(styles).toContain("@media (max-width: 620px)");
    expect(styles).toMatch(/\.room-content-grid\s*\{[^}]*grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.room-player-grid\s*\{[^}]*grid-template-columns:\s*1fr;/);
  });
});
