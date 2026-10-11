import { z } from "zod";

export const PingSchema = z.object({
  name: z.string().trim().min(1).max(20),
});

export type PingPayload = z.infer<typeof PingSchema>;
