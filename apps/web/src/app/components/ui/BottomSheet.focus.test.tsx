import type { DependencyList } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => {
  const focus = vi.fn();
  const effects: Array<{ deps: readonly unknown[]; cleanup?: () => void }> = [];
  let index = 0;
  return { focus, effects, get index() { return index; }, resetIndex() { index = 0; }, next() { return index++; } };
});

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    useRef: () => ({ current: { focus: hooks.focus } }),
    useEffect: (effect: () => void | (() => void), deps: DependencyList) => {
      const slot = hooks.next();
      const previous = hooks.effects[slot];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      previous?.cleanup?.();
      hooks.effects[slot] = { deps, cleanup: effect() ?? undefined };
    },
  };
});

import BottomSheet from "./BottomSheet";

describe("fokus dialog saat timer berubah", () => {
  beforeEach(() => {
    for (const effect of hooks.effects) effect.cleanup?.();
    hooks.effects.length = 0;
    hooks.focus.mockClear();
    vi.stubGlobal("window", new EventTarget());
  });

  it("hanya memfokuskan judul sekali selama terbuka, Escape memakai onClose terbaru", () => {
    const firstClose = vi.fn();
    const latestClose = vi.fn();
    const render = (open: boolean, onClose: () => void, seconds: number) => {
      hooks.resetIndex();
      BottomSheet({ open, onClose, title: "Ganti Bulan", children: `Waktu tersisa: ${seconds} detik` });
    };

    render(true, firstClose, 15);
    expect(hooks.focus).toHaveBeenCalledTimes(1);
    // onClose baru di tiap tick timer, sementara open tetap true.
    for (const seconds of [14, 13, 12]) render(true, () => latestClose(), seconds);
    expect(hooks.focus).toHaveBeenCalledTimes(1);

    const escape = new Event("keydown");
    Object.defineProperty(escape, "key", { value: "Escape" });
    window.dispatchEvent(escape);
    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);

    render(false, latestClose, 0);
    render(true, latestClose, 15);
    expect(hooks.focus).toHaveBeenCalledTimes(2);
  });
});