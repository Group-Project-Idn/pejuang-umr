"use client";

import type { PublicGameState, RoomState } from "@pejuang/shared";
import { hexToWorld, PAWN_DETAILS } from "@/data/game";
import CharacterSprite from "./CharacterSprite";

type GameCharactersProps = {
  game: PublicGameState;
  room: RoomState;
  surfaceY: number;
};

export default function GameCharacters({
  game,
  room,
  surfaceY,
}: GameCharactersProps) {
  return game.pawns.map(({ playerId, hex }) => {
    const player = room.players.find(
      (candidate) => candidate.playerId === playerId,
    );
    if (!player?.pawn) return null;
    const { x, z } = hexToWorld(hex.q, hex.r);

    return (
      <CharacterSprite
        key={playerId}
        name={player.name}
        sprite={PAWN_DETAILS[player.pawn].sprite}
        position={[x, surfaceY, z]}
      />
    );
  });
}