import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
const screen = readFileSync(new URL("./lobby-screen.tsx", import.meta.url), "utf8");

describe("tampilan lobby layar lebar", () => {
  it("mengisi viewport tanpa batas lebar atau bingkai luar", () => {
    expect(screen).toContain('className="lobby-desk lobby-page');
    expect(screen).toContain('className="lobby-viewport');
    expect(screen).toContain('className="lobby-folder lobby-main-folder');
    expect(styles).toMatch(/\.lobby-page\s*\{[^}]*min-height:\s*100dvh;/);
    expect(styles).toMatch(/\.lobby-window\s*\{[^}]*flex:\s*1;/);
    expect(styles).toMatch(/\.lobby-main-folder\s*\{[^}]*flex:\s*1;/);
  });

  it("memperbesar judul dan area sentuh dengan fallback layar kecil", () => {
    expect(screen).toContain('className="lobby-main-title');
    expect(screen).toContain('className="lobby-comic-btn lobby-primary-action');
    expect(styles).toMatch(/\.lobby-main-title\s*\{[^}]*font-size:\s*clamp\(/);
    expect(styles).toMatch(/\.lobby-main-folder \.lobby-primary-action\s*\{[^}]*min-height:\s*64px;/);
    expect(styles).toContain("@media (max-width: 899px), (max-height: 700px)");
    expect(styles).toContain(".lobby-main-folder .lobby-code-actions { flex-wrap: wrap; }");
  });
});