"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

type FormError = {
  message: string;
};

const STATUS_LABELS: Record<AuthMode, string> = {
  signin: "Iniciar sesión",
  signup: "Crear cuenta",
};

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<FormError | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccessMessage(null);

      if (!email.trim()) {
        setError({ message: "El correo electrónico es obligatorio" });
        return;
      }
      if (password.length < 6) {
        setError({
          message:
            mode === "signup"
              ? "La contraseña debe tener al menos 6 caracteres"
              : "Contraseña incorrecta",
        });
        return;
      }

      setLoading(true);

      try {
        if (mode === "signup") {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth`,
            },
          });

          if (signUpError) {
            if (signUpError.message.includes("already registered")) {
              setError({
                message:
                  "Este correo ya está registrado. Prueba iniciando sesión.",
              });
            } else if (
              signUpError.message.toLowerCase().includes("weak password")
            ) {
              setError({
                message:
                  "La contraseña es muy débil. Usa al menos 6 caracteres con mayúsculas, minúsculas y números.",
              });
            } else {
              setError({ message: signUpError.message });
            }
            return;
          }

          setSuccessMessage(
            "¡Cuenta creada! Revisa tu correo para confirmar el registro.",
          );
        } else {
          const { error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError) {
            if (signInError.message.includes("Invalid login credentials")) {
              setError({
                message:
                  "Correo o contraseña incorrectos. Verifica tus datos.",
              });
            } else {
              setError({ message: signInError.message });
            }
            return;
          }

          router.push(redirectTo);
          router.refresh();
        }
      } catch {
        setError({ message: "Ocurrió un error inesperado. Intenta de nuevo." });
      } finally {
        setLoading(false);
      }
    },
    [email, password, mode, supabase, router, redirectTo],
  );

  const handleOAuth = useCallback(
    async (provider: "google" | "github") => {
      setError(null);
      setLoading(true);

      try {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
          },
        });

        if (oauthError) {
          setError({ message: oauthError.message });
        }
      } catch {
        setError({
          message: `Error al iniciar sesión con ${provider === "google" ? "Google" : "GitHub"}.`,
        });
      } finally {
        setLoading(false);
      }
    },
    [supabase, redirectTo],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background ambient glow */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl shadow-xl shadow-black/30">
          {/* Header */}
          <div className="px-8 pt-8 pb-2 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Anime Tracker
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {mode === "signin"
                ? "Inicia sesión para gestionar tu lista"
                : "Crea una cuenta y empieza a seguir tus animes"}
            </p>
          </div>

          {/* Tabs */}
          <div className="mx-8 mt-6 flex rounded-lg border border-white/10 bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccessMessage(null);
              }}
              className={cn(
                "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
                mode === "signin"
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-white/50 hover:text-white/80",
              )}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccessMessage(null);
              }}
              className={cn(
                "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
                mode === "signup"
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-white/50 hover:text-white/80",
              )}
            >
              Crear cuenta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pt-6 pb-4 space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-white/60 uppercase tracking-wider"
              >
                Correo electrónico
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
                disabled={loading}
                className="h-11 w-full px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm transition-all duration-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-white/60 uppercase tracking-wider"
              >
                Contraseña
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                disabled={loading}
                minLength={6}
                className="h-11 w-full px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm transition-all duration-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                <Icon
                  name="AlertCircle"
                  size={16}
                  className="mt-0.5 shrink-0 text-red-400"
                />
                <span>{error.message}</span>
              </div>
            )}

            {/* Success */}
            {successMessage && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
                <Icon
                  name="Check"
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-400"
                />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <Icon
                  name="Loader2"
                  size={16}
                  className="animate-spin"
                />
              ) : null}
              {loading ? "Procesando…" : STATUS_LABELS[mode]}
            </button>
          </form>

          {/* Divider */}
          <div className="px-8 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/40">o continúa con</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="px-8 pb-8 space-y-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white/80 text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuth("github")}
              disabled={loading}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white/80 text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-xs text-white/30">
          {mode === "signin"
            ? "¿No tienes cuenta? Prueba la pestaña «Crear cuenta»"
            : "¿Ya tienes cuenta? Ve a «Iniciar sesión»"}
        </p>
      </div>
    </div>
  );
}
