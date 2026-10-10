const configuredServerUrl = process.env.NEXT_PUBLIC_SERVER_URL;

export function getServerUrl(): string {
  if (!configuredServerUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URL belum dikonfigurasi.");
  }

  return configuredServerUrl;
}