import { DEV_ROOM_CODE } from "@pejuang/shared";

export function canShowDevFinish(input: {
  roomCode: string | null | undefined;
  devToolsFlag: string | undefined;
  hostId: string | null | undefined;
  playerId: string | null | undefined;
}): boolean {
  return (
    input.devToolsFlag === "true" &&
    input.roomCode === DEV_ROOM_CODE &&
    Boolean(input.playerId) &&
    input.hostId === input.playerId
  );
}

export function getDevFinishMessage(error: string): string {
  if (error === "NOT_HOST") return "Alat uji ditolak: hanya host yang boleh menyelesaikan permainan.";
  if (error === "INTERNAL") return "Alat uji tidak merespons. Coba lagi.";
  return `Alat uji ditolak: ${error}`;
}
