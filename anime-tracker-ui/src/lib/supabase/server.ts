import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Next only allows cookie writes from Server Actions and Route
          // Handlers, so this throws during a Server Component render — and an
          // uncaught throw here turns a routine token rotation into a failed
          // page. Swallowing it is safe only because the middleware refreshes
          // the session on every request and writes the cookies there; without
          // that, this catch would silently discard the new token instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Rendering a Server Component. The middleware already handled it.
          }
        },
      },
    },
  );
}
