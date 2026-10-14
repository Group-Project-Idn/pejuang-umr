import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { InviteCard } from "@pejuang/shared";
import { InviteHandCard } from "./invites";

const card: InviteCard = {
  cardId: "card-1", plan: "hangout", planEffects: [{ stat: "stress", delta: -2 }],
  motive: "sincere", expiresAtMonth: 2,
};

const render = (props: Partial<Parameters<typeof InviteHandCard>[0]> = {}) =>
  renderToStaticMarkup(<InviteHandCard card={card} playable={false} selected={false}
    unavailableReason="Bisa dimainkan saat giliranmu sebelum memilih heksa." onSelect={() => {}} {...props} />);

describe("Kartu Ajakan di HUD", () => {
  it("menampilkan kartu pribadi dan tombol nonaktif di luar giliran", () => {
    const markup = render();
    for (const text of ["ui-folder", "Kartu Ajakan", "Ajak Nongkrong", "Efek jika target ikut", "Motif: Tulus", "Berlaku sampai bulan 2", "Bisa dimainkan saat giliranmu"]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('disabled=""');
  });

  it("mengaktifkan pilihan hanya untuk kartu yang boleh dimainkan", () => {
    const markup = render({ playable: true });
    expect(markup).not.toContain('disabled=""');
    expect(markup).toContain("Pilih kartu");
    expect(markup).toContain("Bisa dimainkan sebelum memilih heksa");
    const selected = render({ playable: true, selected: true });
    expect(selected).toContain("invite-hand-card-selected");
    expect(selected).toContain('disabled=""');
    expect(selected).toContain("Pilih pemain yang disorot");
  });

  it("menjaga bentuk kartu saat kosong atau koneksi terputus", () => {
    const empty = render({ card: null });
    expect(empty).toContain("ui-folder");
    expect(empty).toContain("Belum ada Kartu Ajakan");
    expect(empty).toContain('disabled=""');
    expect(render({ unavailableReason: "Menunggu koneksi pulih." })).toContain("Menunggu koneksi pulih.");
  });
});