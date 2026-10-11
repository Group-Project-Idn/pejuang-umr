export type ServerConfig = {
  port: number;
  webOrigin: string;
  guestTokenSecret: string;
  version: string;
  trustProxy: boolean;
};

const PLACEHOLDER_SECRET = "change-me";

export function readServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const guestTokenSecret = env.GUEST_TOKEN_SECRET ?? PLACEHOLDER_SECRET;

  if (env.NODE_ENV === "production") {
    if (
      !guestTokenSecret ||
      guestTokenSecret === PLACEHOLDER_SECRET ||
      guestTokenSecret.length < 32
    ) {
      throw new Error(
        "GUEST_TOKEN_SECRET wajib diisi (bukan placeholder) dengan minimal 32 karakter saat production.",
      );
    }
  }

  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("PORT harus berupa integer antara 0 dan 65535.");
  }

  return {
    port,
    webOrigin: env.WEB_ORIGIN ?? "http://localhost:3000",
    guestTokenSecret,
    version: env.npm_package_version ?? "0.0.0",
    trustProxy: env.TRUST_PROXY === "true",
  };
}