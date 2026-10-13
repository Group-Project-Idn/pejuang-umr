import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileIconBadge, SettingsGearIcon } from "./home-icons";

describe("ikon Home", () => {
  it("ikon profil tampil, tidak aktif, tanpa label Segera hadir", () => {
    const markup = renderToStaticMarkup(<ProfileIconBadge />);
    expect(markup).toContain('aria-label="Profil"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("<svg");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("<a ");
    expect(markup).not.toContain("onClick");
    expect(markup).not.toMatch(/segera hadir/i);
    expect(markup).not.toContain("👛");
  });
  it("ikon pengaturan berupa SVG, bukan emoji", () => {
    const markup = renderToStaticMarkup(<SettingsGearIcon />);
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("⚙");
  });
});
