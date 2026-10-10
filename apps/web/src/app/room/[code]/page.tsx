import { RoomCodeSchema } from "@pejuang/shared";
import { notFound } from "next/navigation";
import { LobbyClient } from "./lobby-client";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const parsed = RoomCodeSchema.safeParse(code.toUpperCase());
  if (!parsed.success) notFound();
  return <LobbyClient code={parsed.data} />;
}
