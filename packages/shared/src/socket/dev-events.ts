import type { z } from "zod";
import type { AckCallback } from "../common/ack";
import { RequestPayloadSchema } from "../schemas/common";

/** Room khusus uji (GDD v1.14). Dicadangkan: tidak pernah dibuat generator kode room. */
export const DEV_ROOM_CODE = "UMR-0099";

/**
 * Event alat dev. Sengaja terpisah dari 46 event produksi (ClientToServerEvents): hanya
 * didaftarkan server bila DEV_TOOLS=true dan tidak pernah saat NODE_ENV=production.
 */
export const DEV_EVENTS = ["dev:finish-game"] as const;

export const DevFinishGameRequestSchema = RequestPayloadSchema;

export interface DevClientToServerEvents {
  "dev:finish-game": (
    payload: z.infer<typeof DevFinishGameRequestSchema>,
    ack: AckCallback,
  ) => void;
}

export const DevEventSchemas: Record<keyof DevClientToServerEvents, z.ZodType> = {
  "dev:finish-game": DevFinishGameRequestSchema,
};
