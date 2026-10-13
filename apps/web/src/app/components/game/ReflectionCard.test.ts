import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReflectionCard from "./ReflectionCard";

const render = (reflection: Parameters<typeof ReflectionCard>[0]["reflection"]) =>
  renderToStaticMarkup(createElement(ReflectionCard, { reflection }));

describe("ReflectionCard", () => {
  it("menampilkan status memuat saat refleksi belum ada", () => {
    expect(render(null)).toContain("Menyusun refleksimu...");
  });
  it("menampilkan ringkasan, insight, referensi, dan label aturan", () => {
    const html = render({
      source: "rules", summary: "Kamu terlalu sering lembur.",
      insights: [{ title: "Istirahat", body: "Tidur cukup.", reference: "Atomic Habits, James Clear" }],
    });
    expect(html).not.toContain("Menyusun refleksimu");
    expect(html).toContain("Kamu terlalu sering lembur.");
    expect(html).toContain("Istirahat");
    expect(html).toContain("Atomic Habits, James Clear");
    expect(html).toContain("Insight berbasis aturan");
  });
  it("tanpa label aturan untuk sumber ai", () => {
    expect(render({ source: "ai", summary: "s", insights: [] })).not.toContain("Insight berbasis aturan");
  });
});
