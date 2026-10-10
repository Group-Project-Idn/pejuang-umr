import type { z } from "zod";
import { RoomPlayerSchema, RoomStateSchema } from "../schemas/room";

export type RoomStatus = z.infer<typeof RoomStateSchema>["status"];
export type StartBlockReason = NonNullable<
  z.infer<typeof RoomStateSchema>["startBlockReason"]
>;

export type RoomPlayer = z.infer<typeof RoomPlayerSchema>;

export type RoomState = z.infer<typeof RoomStateSchema>;
