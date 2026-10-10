export type ServerConfig = {
  port: number;
  webOrigin: string;
  guestTokenSecret: string;
  version: string;
};

export function readServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const guestTokenSecret = env.GUEST_TOKEN_SECRET;
  if (!guestTokenSecret || guestTokenSecret.length < 32) {
    throw new Error(
      "GUEST_TOKEN_SECRET wajib diisi dengan minimal 32 karakter.",
    );
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
  };
}