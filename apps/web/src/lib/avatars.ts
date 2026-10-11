/**
 * Pilihan avatar tamu memakai aset PNG transparan di public/characters/.
 * AvatarId tetap string bebas (validasi Zod di shared), peta ini hanya untuk UI.
 */

export type AvatarOption = {
  id: string;
  name: string;
  src: string;
};

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: "michael", name: "Michael", src: "/characters/michael.png" },
  { id: "raka", name: "Raka", src: "/characters/raka.png" },
  { id: "sinta", name: "Sinta", src: "/characters/sinta.png" },
  { id: "icha", name: "Icha", src: "/characters/icha.png" },
] as const;

export function getAvatarSrc(avatarId: string): string {
  return (
    AVATAR_OPTIONS.find((option) => option.id === avatarId)?.src ??
    AVATAR_OPTIONS[0]!.src
  );
}

export function getAvatarName(avatarId: string): string {
  return (
    AVATAR_OPTIONS.find((option) => option.id === avatarId)?.name ?? avatarId
  );
}
