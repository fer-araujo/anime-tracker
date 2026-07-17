"use server";

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type CheckEmailResult = { exists: boolean; error?: never } | { exists?: never; error: string };

/**
 * Check if an email is already registered in Supabase Auth.
 * Uses the service_role key admin client — never exposed to the client.
 */
export async function checkEmailExists(email: string): Promise<CheckEmailResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("[checkEmailExists] admin.listUsers error:", error.message);
      return { error: "Error al verificar el correo. Intenta de nuevo." };
    }

    const exists = data?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    return { exists: !!exists };
  } catch (err) {
    console.error("[checkEmailExists] unexpected error:", err);
    return { error: "Error inesperado al verificar el correo." };
  }
}
