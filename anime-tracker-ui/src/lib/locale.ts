// src/lib/locale.ts
// Shared locale detection and translations for the app

export type Locale = "es" | "en";

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "es";
  const lang = navigator.language?.slice(0, 2)?.toLowerCase();
  return lang === "es" ? "es" : "en";
}

// Minimal translations for UI elements shared across components
export const uiTranslations = {
  es: {
    signIn: "Iniciar sesión",
    signUp: "Crear cuenta",
    watchlist: "Watchlist",
    signOut: "Cerrar sesión",
    season: "Temporada",
    search: "Buscar",
    toggleMenu: "Alternar menú",
    userMenu: "Menú de usuario",
  },
  en: {
    signIn: "Sign in",
    signUp: "Create account",
    watchlist: "Watchlist",
    signOut: "Sign out",
    season: "Season",
    search: "Search",
    toggleMenu: "Toggle menu",
    userMenu: "User menu",
  },
} as const;
