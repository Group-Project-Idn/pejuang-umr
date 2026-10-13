import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BottomSheet from "./BottomSheet";

describe("dialog map komik", () => {
  it("mempertahankan modal, judul, klip, dan isi dengan warna kertas", () => {
    const markup = renderToStaticMarkup(
      <BottomSheet open title="Ganti Bulan" onClose={() => undefined}>Isi nota</BottomSheet>,
    );
    expect(markup).toContain('role="dialog" aria-modal="true" aria-label="Ganti Bulan"');
    expect(markup).toContain("ui-folder ui-popup comic-dialog-card");
    expect(markup).toContain("ui-clip");
    expect(markup).toContain("ui-popup-title");
    expect(markup).toContain("Isi nota");
  });

  it("tidak menampilkan dialog tertutup", () => {
    expect(renderToStaticMarkup(
      <BottomSheet open={false} title="Ganti Bulan" onClose={() => undefined}>Rahasia</BottomSheet>,
    )).toBe("");
  });
});