/**
 * Origin allowlist matching for CORS.
 *
 * Extracted from app.ts because a mismatch here silently blocks every browser
 * request: the `cors` package just omits the Access-Control-Allow-Origin
 * header, the browser reports a generic failure, and nothing hits the logs.
 */

/**
 * The browser's `Origin` header is always lowercase scheme+host+port with no
 * trailing slash. Env vars are hand-written and routinely carry a trailing
 * slash copied from the address bar, which would never match.
 */
export function normalizeOrigin(value: string): string {
  return value.trim().toLowerCase().replace(/\/+$/, "");
}

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map(normalizeOrigin).filter(Boolean);
}

/**
 * Matches an origin against the allowlist. A `*` in an entry matches exactly
 * one DNS label, so "https://*.vercel.app" covers preview deploys without
 * also matching an attacker's "https://evil.com/x.vercel.app".
 */
export function isOriginAllowed(
  origin: string,
  allowedOrigins: string[],
): boolean {
  const candidate = normalizeOrigin(origin);

  return allowedOrigins.some((allowed) => {
    if (!allowed.includes("*")) return allowed === candidate;

    const pattern = new RegExp(
      `^${allowed
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^.]+")}$`,
    );
    return pattern.test(candidate);
  });
}
