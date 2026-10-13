import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => {
  const refs: Array<{ current: unknown }> = [];
  const effects: Array<{ deps: readonly unknown[]; cleanup?: () => void }> = [];
  let refIndex = 0;
  let effectIndex = 0;
  return {
    refs, effects,
    begin() { refIndex = 0; effectIndex = 0; },
    ref<T>(value: T) { return (refs[refIndex++] ??= { current: value }); },
    effect(callback: () => void | (() => void), deps: readonly unknown[]) {
      const slot = effectIndex++;
      const old = effects[slot];
      if (old && deps.every((value, index) => Object.is(value, old.deps[index]))) return;
      old?.cleanup?.();
      effects[slot] = { deps, cleanup: callback() ?? undefined };
    },
    unmount() { for (const effect of effects) effect.cleanup?.(); effects.length = 0; refs.length = 0; },
  };
});

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    useRef: hooks.ref,
    useMemo: (create: () => unknown) => create(),
    useState: (value: unknown) => [typeof value === "function" ? value() : value, () => undefined],
    useEffect: hooks.effect,
  };
});
vi.mock("@react-three/fiber", () => ({ useFrame: () => undefined }));
vi.mock("@react-three/drei", () => ({
  useTexture: () => ({ image: { width: 32, height: 64 }, clone: () => ({ dispose: () => undefined }) }),
  Html: () => null,
}));

import CharacterSprite from "./CharacterSprite";

type GroupProps = {
  onClick?: (event: { stopPropagation: () => void }) => void;
  onPointerOver?: (event: { stopPropagation: () => void; nativeEvent: { target: HTMLCanvasElement } }) => void;
  onPointerOut?: () => void;
  children: ReactNode;
};

function render(onSelect?: () => void) {
  hooks.begin();
  return CharacterSprite({ name: "Dika", sprite: "/avatar.png", position: [0, 0, 0], onSelect }) as ReactElement<GroupProps>;
}

describe("interaksi pion target Ajakan", () => {
  beforeEach(() => {
    hooks.unmount();
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  });

  it("klik hit-area memilih pemain dan tidak meneruskan klik ke heksa", () => {
    const onSelect = vi.fn();
    const group = render(onSelect);
    const stopPropagation = vi.fn();
    const pickElements = Children.toArray(group.props.children).flatMap((child) =>
      isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
        ? Children.toArray(child.props.children) : [child],
    );
    const hitArea = pickElements.find(
      (child) => isValidElement<{ children?: ReactNode }>(child) && child.type === "mesh" &&
        Children.toArray(child.props.children).some(
          (part) => isValidElement(part) && part.type === "cylinderGeometry",
        ),
    );
    expect(hitArea).toBeDefined();
    group.props.onClick?.({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("membersihkan kursor hover saat mode pilih berakhir atau target tidak bisa dipilih", () => {
    const canvas = { style: { cursor: "crosshair" } } as HTMLCanvasElement;
    const group = render(vi.fn());
    const stopPropagation = vi.fn();
    group.props.onPointerOver?.({ stopPropagation, nativeEvent: { target: canvas } });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(canvas.style.cursor).toBe("pointer");
    const plainGroup = render();
    expect(plainGroup.props.onClick).toBeUndefined();
    expect(plainGroup.props.onPointerOver).toBeUndefined();
    expect(canvas.style.cursor).toBe("crosshair");
  });

  it("mengembalikan kursor ketika pointer meninggalkan pion", () => {
    const canvas = { style: { cursor: "auto" } } as HTMLCanvasElement;
    const group = render(vi.fn());
    group.props.onPointerOver?.({ stopPropagation: () => undefined, nativeEvent: { target: canvas } });
    group.props.onPointerOut?.();
    expect(canvas.style.cursor).toBe("auto");
  });

  it("mengembalikan kursor saat pion dilepas dari papan", () => {
    const canvas = { style: { cursor: "grab" } } as HTMLCanvasElement;
    render(vi.fn()).props.onPointerOver?.({ stopPropagation: () => undefined, nativeEvent: { target: canvas } });
    hooks.unmount();
    expect(canvas.style.cursor).toBe("grab");
  });
});