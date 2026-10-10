export type AvatarId = string;

export type PawnId =
  | "cream-circle"
  | "iceblue-square"
  | "mint-triangle"
  | "salmon-diamond";

export type Stat = "wealth" | "debt" | "health" | "stress";

export type Effect = {
  stat: Stat;
  delta: number;
};

export type PublicPlayer = {
  playerId: string;
  name: string;
  avatarId: AvatarId;
  pawn: PawnId | null;
  connected: boolean;
};

export type PrivateStatus = {
  wealth: number;
  debt: number;
  debtLimit: 25_000_000;
  health: number;
  stress: number;
};