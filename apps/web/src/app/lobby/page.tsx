import { RoomCodeSchema } from "@pejuang/shared";
import { notFound } from "next/navigation";
import { LobbyScreen } from "./lobby-screen";

type LobbyPageProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

/** Layar Lobby: daftar bantuan + form gabung via kode (validasi Zod). */
export default async function LobbyPage({ searchParams }: LobbyPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const initialCode = raw ?? "";
  if (raw) {
    const parsed = RoomCodeSchema.safeParse(raw.toUpperCase());
    if (!parsed.success) notFound();
  }
  return <LobbyScreen initialCode={initialCode.toUpperCase()} />;
}
