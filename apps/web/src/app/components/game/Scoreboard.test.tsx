import type { PublicGameState, RoomState } from "@pejuang/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import Scoreboard from "./Scoreboard";

const game = {
  scores: [
    { playerId: "p1", rank: 1, provisionalScore: 100, eliminated: false },
    { playerId: "p2", rank: 2, provisionalScore: 80, eliminated: false },
    { playerId: "p3", rank: 3, provisionalScore: 50, eliminated: true },
  ],
  activePlayerId: "p1", gold: null,
} as PublicGameState;
const room = { players: [
  { playerId: "p1", name: "Rina", avatarId: "sinta" },
  { playerId: "p2", name: "Dika", avatarId: "raka" },
  { playerId: "p3", name: "Budi", avatarId: "michael" },
] } as unknown as RoomState;

function findElements(node: ReactNode, type: string): ReactElement[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [
    ...(node.type === type ? [node] : []),
    ...Children.toArray(node.props.children).flatMap((child) => findElements(child, type)),
  ];
}

describe("Papan Skor saat memilih target Ajakan", () => {
  it("klik pada seluruh baris target mengirim ID tepat; baris nonaktif tidak punya handler", () => {
    const onSelect = vi.fn();
    const tree = Scoreboard({ game, room, playerId: "p1", pickTarget: { disabledIds: ["p1", "p3"], onSelect } });
    const buttons = findElements(tree, "button");
    expect(buttons).toHaveLength(1);
    (buttons[0].props as { onClick: () => void }).onClick();
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("p2");
  });

  it("membuat hanya baris target yang boleh dipilih sebagai tombol penuh", () => {
    const markup = renderToStaticMarkup(<Scoreboard game={game} room={room} playerId="p1"
      pickTarget={{ disabledIds: ["p1", "p3"], onSelect: () => undefined }} />);
    expect(markup).toContain('aria-label="Ajak Dika"');
    expect(markup).not.toContain('aria-label="Ajak Rina"');
    expect(markup).not.toContain('aria-label="Ajak Budi"');
    expect(markup.match(/class="invite-score-chip"/g)).toHaveLength(1);
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(markup).toMatch(/<button[^>]*aria-label="Ajak Dika"[^>]*>[\s\S]*?Dika[\s\S]*?80 poin[\s\S]*?Ajak<\/span><\/button>/);
  });

  it("tanpa mode pilih target mempertahankan baris biasa", () => {
    const markup = renderToStaticMarkup(<Scoreboard game={game} room={room} playerId="p1" />);
    expect(markup).not.toContain("invite-score-button");
    expect(markup).not.toContain("aria-disabled");
    expect(markup).toContain("Dika");
  });
});