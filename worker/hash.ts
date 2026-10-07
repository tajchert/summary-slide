/** First `hexChars` of the SHA-256 hex digest — short content-addressed keys/ids. */
export async function sha256Hex(data: BufferSource, hexChars = 16): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, hexChars);
}
