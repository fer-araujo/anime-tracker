import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session and hand the new cookies back to the browser.
 *
 * Without this the app logs people out at random, roughly an hour after they
 * sign in. Supabase access tokens expire in an hour and only the browser client
 * knows how to renew one; the server merely reads the cookie. So a tab that has
 * been open past the hour renews in memory while every server render still sees
 * the expired token — the page loads, the data does not, and a hard refresh
 * "fixes" it because that is when the browser client finally rewrites the
 * cookie. The symptom looks intermittent and is really a clock.
 *
 * `getUser()` rather than `getSession()`: getSession reads the token without
 * contacting Supabase, so it neither validates nor renews anything. getUser
 * revalidates against the auth server, and that round trip is what rotates an
 * expiring refresh token. Calling the cheaper one here would compile, run, and
 * fix nothing.
 *
 * The response object is threaded through rather than rebuilt. `setAll` writes
 * onto it as the client rotates tokens, so replacing it afterwards would drop
 * the very cookies this function exists to deliver.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // A missing key must not take the whole site down with a 500 on every route.
  // Signed-out browsing keeps working; only the session refresh is lost.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Supabase unreachable, or the refresh token was revoked. Neither is a
    // reason to refuse the page: the request continues signed out rather than
    // erroring, and the client will surface the real state.
  }

  return response;
}
