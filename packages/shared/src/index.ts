import { z } from "zod";

export const PingSchema = z.object({
  name: z.string().min(1).max(20),
});

export type PingPayload = z.infer<typeof PingSchema>;
