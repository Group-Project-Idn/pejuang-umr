import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { AvatarId } from "@pejuang/shared";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type GuestIdentity = {
  playerId: string;
  name: string;
  avatarId: AvatarId;
};

type GuestTokenPayload = GuestIdentity & {
  expiresAt: number;
};

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createGuestToken(
  input: Omit<GuestIdentity, "playerId"> & { playerId?: string },
  secret: string,
  now = Date.now(),
): { identity: GuestIdentity; token: string; expiresAt: number } {
  const identity: GuestIdentity = {
    playerId: input.playerId ?? randomUUID(),
    name: input.name,
    avatarId: input.avatarId,
  };
  const payload: GuestTokenPayload = {
    ...identity,
    expiresAt: now + TOKEN_TTL_MS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);

  return {
    identity,
    token: `${encodedPayload}.${signature}`,
    expiresAt: payload.expiresAt,
  };
}

export function verifyGuestToken(
  token: string,
  secret: string,
  now = Date.now(),
): GuestTokenPayload | null {
  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<GuestTokenPayload>;

    if (
      typeof payload.playerId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.avatarId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= now
    ) {
      return null;
    }

    return payload as GuestTokenPayload;
  } catch {
    return null;
  }
}