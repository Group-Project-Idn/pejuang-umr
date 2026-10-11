type ClipboardWriter = Pick<Clipboard, "writeText">;

export async function copyTextToClipboard(
  text: string,
  clipboard: ClipboardWriter | undefined,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}