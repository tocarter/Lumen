/**
 * OAuth 1.0a request signing for the Schoology REST API.
 * Two-legged: district issues a key and secret; requests signed with them
 * act as that account. No user consent round trip.
 */

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

async function hmacSha1(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function nonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SchoologyKeys {
  key: string;
  secret: string;
}

export async function authorizationHeader(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  keys: SchoologyKeys
): Promise<string> {
  const parsed = new URL(url);

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: keys.key,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };

  const signing: [string, string][] = Object.entries(oauthParams);
  parsed.searchParams.forEach((value, name) => signing.push([name, value]));

  const normalized = signing
    .map(([n, v]) => [rfc3986(n), rfc3986(v)] as const)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([n, v]) => `${n}=${v}`)
    .join("&");

  const bare = `${parsed.origin}${parsed.pathname}`;
  const base = [method.toUpperCase(), rfc3986(bare), rfc3986(normalized)].join("&");
  const signature = await hmacSha1(`${rfc3986(keys.secret)}&`, base);

  const header = { ...oauthParams, oauth_signature: signature };
  return `OAuth ${Object.entries(header)
    .map(([n, v]) => `${rfc3986(n)}="${rfc3986(v)}"`)
    .join(",")}`;
}
