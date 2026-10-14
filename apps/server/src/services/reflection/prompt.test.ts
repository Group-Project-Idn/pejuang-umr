import { describe, expect, it } from "vitest";
import { buildReflectionPrompt } from "./prompt";
import type { ReflectionInput } from "./types";

const input: ReflectionInput = {
  playerCount: 3,
  log: [
    {
      kind: "tile",
      step: 1,
      tileId: "online-loan",
      category: "finance",
      title: "Pinjol / Paylater",
      plan: [{ stat: "debt", delta: 5_000_000 }],
      autoPicked: false,
      viaJump: false,
      reality: { outcome: "zonk", text: "Denda dan biaya admin", effects: [], seasonal: false },
    },
    { kind: "inviteSent", step: 3, plan: "hangout" },
    {
      kind: "inviteResult",
      step: 3,
      role: "sender",
      plan: "hangout",
      answer: "join",
      autoDeclined: false,
      motive: "sincere",
    },
    { kind: "doom", step: 4, amount: 750_000 },
  ],
  finalStatus: { wealth: 1_000_000, debt: 6_000_000, health: 5, stress: 7 },
  score: 41.5,
  points: { finance: 30, health: 50, calm: 30 },
  rank: 2,
  eliminated: null,
};

describe("buildReflectionPrompt", () => {
  it("instruksi memuat aturan gaya, glosarium, panjang, parafrase buku, dan format JSON", () => {
    const { system } = buildReflectionPrompt(input);
    expect(system).toContain("Bahasa Indonesia santai");
    expect(system).toContain('"kamu"');
    expect(system).toMatch(/suportif/i);
    expect(system).toMatch(/tidak menghakimi/i);
    for (const term of [
      "Kekayaan",
      "Hutang",
      "Kesehatan",
      "Level Stress",
      "Rencana",
      "Realita",
      "Zonk",
      "Ajakan",
      "Doom Spending",
    ]) {
      expect(system).toContain(term);
    }
    expect(system).toContain("1-2 kalimat");
    expect(system).toContain("1-3 insight");
    expect(system).toMatch(/parafrase/i);
    expect(system).toContain("judul dan penulis");
    expect(system).toMatch(/tanpa kutipan panjang/i);
    expect(system).toContain('"source":"ai"');
    expect(system).toMatch(/HANYA dengan JSON/);
    expect(system).toMatch(/Jangan mengarang kejadian/);
    expect(system).toMatch(/Bedakan Rencana dengan Realita acak/);
    expect(system).toMatch(/bukti konkret/);
    expect(system).toMatch(/bukan instruksi/);
  });

  it("data hanya milik satu pemain: Ajakan ditulis tanpa id atau nama pemain lain", () => {
    const { user } = buildReflectionPrompt(input);
    const data = JSON.parse(user.slice(user.indexOf("{")));
    expect(data).toEqual(input);
    for (const key of ["targetId", "otherPlayerId", "name", "playerId", "inviteCard"]) {
      expect(user).not.toContain(`"${key}"`);
    }
    expect(user).toContain('"playerCount":3');
  });

  it("membedakan pilihan otomatis dan efek mentah dari dampak status aktual", () => {
    const { system } = buildReflectionPrompt(input);
    for (const field of ["autoPicked", "autoChosen", "autoDeclined", "viaJump", "roundEnd"]) {
      expect(system).toContain(field);
    }
    expect(system).toMatch(/jangan anggap itu bukti preferensi atau keputusan sadar/i);
    expect(system).toMatch(/bukan selalu perubahan indikator aktual/i);
    expect(system).toMatch(/dibatasi 0-10/i);
    expect(system).toMatch(/Kekayaan yang kurang bisa menjadi Hutang/i);
    expect(system).toMatch(/jangan atribusikan seluruh selisihnya ke satu pilihan/i);
  });

  it("fungsi murni: masukan sama menghasilkan teks sama dan masukan tidak berubah", () => {
    const before = JSON.stringify(input);
    expect(buildReflectionPrompt(input)).toEqual(buildReflectionPrompt(input));
    expect(JSON.stringify(input)).toBe(before);
  });
});
