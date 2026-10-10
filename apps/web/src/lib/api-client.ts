import {
  GuestResponseSchema,
  type Ack,
  type GuestRequest,
  type GuestResponse,
} from "@pejuang/shared";
import { getServerUrl } from "./config";

export type HealthResponse = {
  status: "ok";
  uptime: number;
  version: string;
  serverTime: number;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getServerUrl()}/health`, { cache: "no-store" });
  if (!response.ok) throw new Error("HEALTH_CHECK_FAILED");
  return (await response.json()) as HealthResponse;
}

export async function createOrUpdateGuest(
  payload: GuestRequest,
  token?: string,
): Promise<GuestResponse> {
  const response = await fetch(`${getServerUrl()}/api/v1/guest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as Ack<GuestResponse> | GuestResponse;

  if (!response.ok || body.ok === false) {
    const error = body.ok === false ? body.error : "INTERNAL";
    throw new Error(error);
  }

  return GuestResponseSchema.parse(body);
}