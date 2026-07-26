import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    console.log(`[RATE LIMIT] IP ${ip} exceeded ${RATE_LIMIT_MAX_REQUESTS} requests in 60s`);
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);

  const { pathname } = request.nextUrl;
  // Redirect old /watchlist and /my-anime to /lists
  if (pathname === "/watchlist" || pathname.startsWith("/watchlist/") ||
      pathname === "/my-anime" || pathname.startsWith("/my-anime/")) {
    const newUrl = new URL(
      pathname.replace(/^\/(watchlist|my-anime)/, "/lists"),
      request.url
    );
    return NextResponse.redirect(newUrl, { status: 308 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
