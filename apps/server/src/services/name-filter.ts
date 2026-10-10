const BLOCKED_WORDS = ["anjing", "bangsat", "kontol", "memek", "fuck", "shit"];

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("4", "a")
    .replaceAll("3", "e")
    .replaceAll("1", "i")
    .replaceAll("0", "o")
    .replace(/[^a-z]/g, "");
}

export function isNameRejected(name: string): boolean {
  const normalized = normalizeName(name);
  return BLOCKED_WORDS.some((word) => normalized.includes(word));
}