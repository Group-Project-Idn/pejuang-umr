import { RoomCodeSchema } from "@pejuang/shared";
import { LobbyScreen } from "./lobby/lobby-screen";

type HomeProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

/**
 * Entry Multiplayer Lobby: "/" memakai UI Ruang Rapat yang sama dengan
 * "/lobby" agar tidak ada dua implementasi lobby yang berbeda.
 */
export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  if (raw) {
    const parsed = RoomCodeSchema.safeParse(raw.toUpperCase());
    if (parsed.success) {
      return <LobbyScreen initialCode={parsed.data} hideHomeButton />;
    }
  }
  return <LobbyScreen initialCode="" hideHomeButton />;
}
