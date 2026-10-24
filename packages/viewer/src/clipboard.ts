/**
 * The system clipboard. Best-effort: where the page may not write to it, the
 * copy is dropped and the call answers false.
 */
export async function copyText(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}
