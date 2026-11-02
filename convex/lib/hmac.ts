/**
 * HMAC signing for every call between Convex and n8n, in both directions.
 *
 * The sender computes HMAC-SHA256(secret, `${timestamp}.${body}`) and sends:
 *   X-LendLoop-Timestamp: <unix seconds>
 *   X-LendLoop-Signature: sha256=<hex>
 * The receiver recomputes it over the exact raw body it received and
 * compares in constant time. Signing the timestamp too, and refusing old
 * timestamps, stops a captured request from being replayed later.
 *
 * Uses Web Crypto, which the default Convex runtime provides.
 */

export const SIGNATURE_HEADER = "X-LendLoop-Signature";
export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
const MAX_AGE_SECONDS = 5 * 60;

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings without leaking, through timing, where they differ. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Headers to send with `body`, signed with `secret`. */
export async function signedHeaders(
  secret: string,
  body: string,
  now = Date.now(),
): Promise<Record<string, string>> {
  const timestamp = Math.floor(now / 1000).toString();
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`,
  };
}

/** True only if `body` was signed with `secret` within the last 5 minutes. */
export async function verifySignature(
  secret: string,
  headers: Headers,
  body: string,
  now = Date.now(),
): Promise<boolean> {
  const timestamp = headers.get(TIMESTAMP_HEADER);
  const signature = headers.get(SIGNATURE_HEADER);
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;

  const age = Math.abs(now / 1000 - Number(timestamp));
  if (age > MAX_AGE_SECONDS) return false;

  const expected = `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  return timingSafeEqual(expected, signature);
}
