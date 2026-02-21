export async function copyToClipboard(text: string, onSuccess?: () => void, onError?: (error: Error) => void) {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess?.();
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    onError?.(err as Error);
    return false;
  }
}

