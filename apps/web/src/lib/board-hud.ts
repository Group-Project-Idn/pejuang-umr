export const NO_WEBGL_MESSAGE =
  "Perangkatmu belum mendukung papan 3D. Coba buka di komputer atau browser lain.";

/** WebGL tersedia bila konteks bisa dibuat; error apa pun dianggap tidak tersedia. */
export function isWebGLAvailable(
  createCanvas: () => Pick<HTMLCanvasElement, "getContext"> = () =>
    document.createElement("canvas"),
): boolean {
  try {
    const canvas = createCanvas();
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export type ScoreRowView = {
  playerId: string;
  rank: number;
  scoreText: string;
  isFirst: boolean;
  eliminated: boolean;
  isTurn: boolean;
};

export function buildScoreRows(
  scores: readonly {
    playerId: string;
    provisionalScore: number;
    rank: number;
    eliminated: boolean;
  }[],
  activePlayerId: string | null,
): ScoreRowView[] {
  return [...scores]
    .sort(
      (a, b) => a.rank - b.rank || b.provisionalScore - a.provisionalScore,
    )
    .map((score) => ({
      playerId: score.playerId,
      rank: score.rank,
      scoreText: `${Math.round(score.provisionalScore)} poin`,
      isFirst: score.rank === 1 && !score.eliminated,
      eliminated: score.eliminated,
      isTurn: !score.eliminated && score.playerId === activePlayerId,
    }));
}
