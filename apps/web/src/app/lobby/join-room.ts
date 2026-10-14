import { RoomCodeSchema } from "@pejuang/shared";
import type { lookupRoom } from "@/lib/api-client";
import type { connectGameSocket } from "@/lib/socket";
import { createRequestId } from "@/lib/request-id";

export type JoinRoomResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

export async function joinRoomByCode(
  rawCode: string,
  token: string,
  deps: {
    lookupRoom: typeof lookupRoom;
    connectGameSocket: typeof connectGameSocket;
    onJoining?: () => void;
  },
): Promise<JoinRoomResult> {
  const code = rawCode.trim().toUpperCase();
  if (!RoomCodeSchema.safeParse(code).success) return { ok: false, error: "INVALID_PAYLOAD" };
  try {
    const lookup = await deps.lookupRoom(code, token);
    if (!lookup.joinable) return { ok: false, error: lookup.reason ?? "ROOM_LOCKED" };
    deps.onJoining?.();
    const socket = await deps.connectGameSocket(token);
    const ack = await new Promise<JoinRoomResult>((resolve) => {
      socket.timeout(5000).emit("room:join", { requestId: createRequestId(), roomCode: code }, (error, response) => {
        resolve(error ? { ok: false, error: "HEALTH_CHECK_FAILED" }
          : response.ok ? { ok: true, code } : { ok: false, error: response.error });
      });
    });
    return ack.ok ? { ok: true, code } : ack;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "INTERNAL" };
  }
}