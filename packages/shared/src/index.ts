import { z } from "zod";

export * from "./common/ack";
export * from "./common/errors";
export * from "./common/request";
export * from "./schemas/common";
export * from "./schemas/game";
export * from "./schemas/guest";
export * from "./schemas/room";
export * from "./socket/events";
export * from "./types/calendar";
export * from "./types/game";
export * from "./types/invite";
export * from "./types/player";
export * from "./types/room";

export const PingSchema = z.object({
  name: z.string().trim().min(1).max(20),
});

export type PingPayload = z.infer<typeof PingSchema>;
