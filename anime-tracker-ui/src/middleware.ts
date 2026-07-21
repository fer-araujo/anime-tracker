import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
  matcher: ["/watchlist/:path*", "/my-anime/:path*"],
};
