import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Category } from "@pejuang/shared";
import CategoryIcon from "./CategoryIcon";
import StatusPanel from "./StatusPanel";

const entries: Array<[Category, string, string]> = [
  ["work", "💼", "Kerja (Karier)"],
  ["social", "🤝", "Sosial"],
  ["health", "💚", "Kesehatan"],
  ["finance", "💰", "Keuangan / Rezeki"],
];

describe("emoji kategori papan dan Kamus Petak", () => {
  it.each(entries)("%s konsisten dan dekoratif", (category, emoji, label) => {
    const boardIcon = renderToStaticMarkup(<CategoryIcon category={category} size={34} />);
    const legend = renderToStaticMarkup(<StatusPanel status={null} />);
    expect(boardIcon).toContain(emoji);
    expect(boardIcon).toContain('aria-hidden="true"');
    expect(boardIcon).toContain('width:34px;height:34px');
    expect(legend).toContain(emoji);
    expect(legend).toContain(label);
  });

  it("Petak Emas tetap berbentuk bintang SVG", () => {
    const icon = renderToStaticMarkup(<CategoryIcon category="gold" size={30} />);
    expect(icon).toContain("<svg");
    expect(icon).not.toContain("💰");
  });
});