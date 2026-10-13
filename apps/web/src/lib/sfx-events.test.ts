import { describe, expect, it } from "vitest";
import { popupOpenSound, revealSounds, tickSound } from "./sfx-events";

const set = (...keys: string[]) => new Set(keys);

describe("popupOpenSound", () => {
  it("memilih suara paling mendesak", () => {
    expect(popupOpenSound([])).toBeNull();
    expect(popupOpenSound(["season"])).toBe("popup-open");
    expect(popupOpenSound(["calendar", "burden"])).toBe("popup-open");
    expect(popupOpenSound(["season", "gold"])).toBe("gold");
    expect(popupOpenSound(["inviteResult"])).toBe("invite");
    expect(popupOpenSound(["gold", "month"])).toBe("month");
    expect(popupOpenSound(["month", "doom"])).toBe("doom");
  });
});

describe("tickSound", () => {
  it("hanya 5 detik terakhir dengan deadline", () => {
    expect(tickSound(6, true, true)).toBeNull();
    expect(tickSound(5, true, true)).toBe("tick");
    expect(tickSound(1, true, true)).toBe("tick");
    expect(tickSound(0, true, true)).toBeNull();
    expect(tickSound(3, false, true)).toBeNull();
  });
  it("hanya untuk pemain yang sedang giliran", () => {
    expect(tickSound(3, true, false)).toBeNull();
    expect(tickSound(3, true, true)).toBe("tick");
  });
});

describe("revealSounds", () => {
  const outcomes: Record<string, "zonk" | "safe" | "lucky" | null> = { a: "zonk", b: "safe", c: "lucky", g: null };
  const outcomeOf = (key: string) => outcomes[key];

  it("awal animasi flip tidak membocorkan hasil", () => {
    const sounds = revealSounds(
      { activeKey: null, flipped: set() },
      { activeKey: "a", flipped: set() },
      outcomeOf,
    );
    expect(sounds).toEqual(["flip"]);
  });
  it("hasil dibunyikan saat heksa selesai dibalik, flip berikutnya mengikuti", () => {
    expect(revealSounds(
      { activeKey: "a", flipped: set() },
      { activeKey: null, flipped: set("a") },
      outcomeOf,
    )).toEqual(["zonk"]);
    expect(revealSounds(
      { activeKey: "a", flipped: set() },
      { activeKey: "b", flipped: set("a") },
      outcomeOf,
    )).toEqual(["flip", "zonk"]);
  });
  it("Aman, Hoki, dan Petak Emas", () => {
    const after = (key: string) => revealSounds(
      { activeKey: key, flipped: set() },
      { activeKey: null, flipped: set(key) },
      outcomeOf,
    );
    expect(after("b")).toEqual(["safe"]);
    expect(after("c")).toEqual(["lucky"]);
    expect(after("g")).toEqual(["gold"]);
  });
  it("tidak mengulang dan melewati heksa tak dikenal", () => {
    const state = { activeKey: null, flipped: set("a") };
    expect(revealSounds(state, state, outcomeOf)).toEqual([]);
    expect(revealSounds(
      { activeKey: null, flipped: set() },
      { activeKey: null, flipped: set("x") },
      outcomeOf,
    )).toEqual(["flip"]);
  });
  it("reduced motion: semua heksa langsung terbuka, tiap heksa berbunyi sekali", () => {
    const empty = { activeKey: null, flipped: set() };
    const all = { activeKey: null, flipped: set("a", "b", "g") };
    const sounds = revealSounds(empty, all, outcomeOf);
    expect(sounds).toEqual(["flip", "zonk", "flip", "safe", "flip", "gold"]);
    // Evaluasi berikutnya dengan state yang sama tidak mengulang.
    expect(revealSounds(all, all, outcomeOf)).toEqual([]);
  });
  it("zonk/safe/lucky tidak pernah keluar sebelum heksa dibuka", () => {
    const sounds = revealSounds(
      { activeKey: null, flipped: set() },
      { activeKey: "a", flipped: set() },
      outcomeOf,
    );
    expect(sounds.some((id) => id === "zonk" || id === "safe" || id === "lucky")).toBe(false);
  });
});
