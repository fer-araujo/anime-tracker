"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { checkEmailExists } from "@/actions/auth";
import Icon from "@/components/custom/Icon";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type AuthStep = "email" | "signin" | "signup";
type FormError = { message: string };

/* -------------------------------------------------------------------------- */
/*  Google OAuth button (shared across steps)                                  */
/* -------------------------------------------------------------------------- */

function GoogleOAuthButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white/80 text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
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
  );
}

/* -------------------------------------------------------------------------- */
/*  Form divider                                                               */
/* -------------------------------------------------------------------------- */

function Divider() {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs text-white/40">o continúa con</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Input wrapper (label + input)                                              */
/* -------------------------------------------------------------------------- */

function FormInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  autoFocus,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-white/60 uppercase tracking-wider"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        disabled={disabled}
        autoFocus={autoFocus}
        minLength={minLength}
        className="h-12 w-full px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm transition-all duration-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Error / Success banners                                                    */
/* -------------------------------------------------------------------------- */

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
      <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0 text-red-400" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
      <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-emerald-400" />
      <span>{message}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Email badge chip                                                           */
/* -------------------------------------------------------------------------- */

function EmailBadge({ email }: { email: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/60">
      <Icon name="Mail" size={12} />
      {email}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page motion variants                                                       */
/* -------------------------------------------------------------------------- */

const pageTransition: {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
  transition: Transition;
} = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2, ease: "easeOut" },
};

/* ========================================================================== */
/*  AuthForm                                                                   */
/* ========================================================================== */

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<FormError | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = createClient();

  /* ---- Step 1: Submit email to check existence ---- */
  const handleEmailSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmed = email.trim();
      if (!trimmed) {
        setError({ message: "El correo electrónico es obligatorio" });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError({ message: "Correo electrónico inválido" });
        return;
      }

      setCheckingEmail(true);
      try {
        const result = await checkEmailExists(trimmed);
        if (result.error) {
          setError({ message: result.error });
          return;
        }
        setStep(result.exists ? "signin" : "signup");
      } catch {
        setError({ message: "Error al verificar el correo. Intenta de nuevo." });
      } finally {
        setCheckingEmail(false);
      }
    },
    [email],
  );

  /* ---- Step 2a: Sign in with password ---- */
  const handleSignIn = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!password) {
        setError({ message: "La contraseña es obligatoria" });
        return;
      }

      setLoading(true);
      try {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) {
          if (
            signInError.message.includes("Invalid login credentials")
          ) {
            setError({
              message: "Correo o contraseña incorrectos.",
            });
          } else {
            setError({ message: signInError.message });
          }
          return;
        }

        router.push(redirectTo);
        router.refresh();
      } catch {
        setError({ message: "Error inesperado. Intenta de nuevo." });
      } finally {
        setLoading(false);
      }
    },
    [email, password, supabase, router, redirectTo],
  );

  /* ---- Step 2b: Create account ---- */
  const handleSignUp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!username.trim()) {
        setError({ message: "El nombre de usuario es obligatorio" });
        return;
      }
      if (password.length < 6) {
        setError({
          message: "La contraseña debe tener al menos 6 caracteres",
        });
        return;
      }

      setLoading(true);
      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim() },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            setError({
              message: "Este correo ya está registrado.",
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
          "¡Cuenta creada! Revisa tu correo para confirmar.",
        );
      } catch {
        setError({ message: "Error inesperado. Intenta de nuevo." });
      } finally {
        setLoading(false);
      }
    },
    [email, password, username, supabase],
  );

  /* ---- Google OAuth (available at all steps) ---- */
  const handleGoogleOAuth = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (oauthError) {
        setError({ message: oauthError.message });
      }
    } catch {
      setError({ message: "Error al iniciar sesión con Google." });
    } finally {
      setLoading(false);
    }
  }, [supabase, redirectTo]);

  /* ---- Navigation ---- */
  const goBackToEmail = () => {
    setStep("email");
    setError(null);
    setPassword("");
    setUsername("");
  };

  /* ========================================================================= */
  /*  RENDER                                                                    */
  /* ========================================================================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl shadow-xl shadow-black/30">
          <AnimatePresence mode="wait">
            {/* ================================================================ */}
            {/*  STEP: EMAIL                                                      */}
            {/* ================================================================ */}
            {step === "email" && (
              <motion.div key="email" {...pageTransition}>
                <div className="px-8 pt-8 pb-2 text-center">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Anime Tracker
                  </h1>
                  <p className="mt-1.5 text-sm text-white/50">
                    Ingresa tu correo para continuar
                  </p>
                </div>

                <form
                  onSubmit={handleEmailSubmit}
                  className="px-8 pt-6 pb-4 space-y-4"
                >
                  <FormInput
                    id="step-email"
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    disabled={checkingEmail}
                    autoFocus
                  />

                  {error && <ErrorBanner message={error.message} />}

                  <button
                    type="submit"
                    disabled={checkingEmail}
                    className="h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {checkingEmail ? (
                      <Icon name="Loader2" size={16} className="animate-spin" />
                    ) : null}
                    {checkingEmail ? "Verificando…" : "Continuar"}
                  </button>
                </form>

                <div className="px-8 pb-8">
                  <Divider />
                  <GoogleOAuthButton
                    onClick={handleGoogleOAuth}
                    disabled={checkingEmail}
                  />
                </div>
              </motion.div>
            )}

            {/* ================================================================ */}
            {/*  STEP: SIGN IN                                                    */}
            {/* ================================================================ */}
            {step === "signin" && (
              <motion.div key="signin" {...pageTransition}>
                <div className="px-8 pt-8 pb-2">
                  <button
                    type="button"
                    onClick={goBackToEmail}
                    className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    <Icon name="ChevronLeft" size={14} />
                    Otro correo
                  </button>
                </div>

                <div className="px-8 pb-2 text-center">
                  <EmailBadge email={email} />
                  <h1 className="mt-3 text-xl font-bold text-white tracking-tight">
                    Bienvenido de vuelta
                  </h1>
                  <p className="mt-1 text-sm text-white/50">
                    Ingresa tu contraseña
                  </p>
                </div>

                <form
                  onSubmit={handleSignIn}
                  className="px-8 pt-4 pb-4 space-y-4"
                >
                  <FormInput
                    id="step-signin-password"
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    autoFocus
                  />

                  {error && <ErrorBanner message={error.message} />}

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Icon name="Loader2" size={16} className="animate-spin" />
                    ) : null}
                    {loading ? "Iniciando sesión…" : "Iniciar sesión"}
                  </button>
                </form>

                <div className="px-8 pb-8">
                  <Divider />
                  <GoogleOAuthButton
                    onClick={handleGoogleOAuth}
                    disabled={loading}
                  />
                </div>
              </motion.div>
            )}

            {/* ================================================================ */}
            {/*  STEP: SIGN UP                                                    */}
            {/* ================================================================ */}
            {step === "signup" && (
              <motion.div key="signup" {...pageTransition}>
                <div className="px-8 pt-8 pb-2">
                  <button
                    type="button"
                    onClick={goBackToEmail}
                    className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    <Icon name="ChevronLeft" size={14} />
                    Otro correo
                  </button>
                </div>

                <div className="px-8 pb-2 text-center">
                  <EmailBadge email={email} />
                  <h1 className="mt-3 text-xl font-bold text-white tracking-tight">
                    Crea tu cuenta
                  </h1>
                  <p className="mt-1 text-sm text-white/50">
                    Elige un usuario y contraseña
                  </p>
                </div>

                <form
                  onSubmit={handleSignUp}
                  className="px-8 pt-4 pb-4 space-y-4"
                >
                  <FormInput
                    id="step-signup-username"
                    label="Nombre de usuario"
                    value={username}
                    onChange={setUsername}
                    placeholder="tu_usuario"
                    autoComplete="username"
                    disabled={loading}
                    autoFocus
                  />

                  <FormInput
                    id="step-signup-password"
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={6}
                  />

                  {error && <ErrorBanner message={error.message} />}
                  {successMessage && (
                    <SuccessBanner message={successMessage} />
                  )}

                  <button
                    type="submit"
                    disabled={loading || !!successMessage}
                    className="h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Icon name="Loader2" size={16} className="animate-spin" />
                    ) : null}
                    {loading ? "Creando cuenta…" : "Crear cuenta"}
                  </button>
                </form>

                <div className="px-8 pb-8">
                  <Divider />
                  <GoogleOAuthButton
                    onClick={handleGoogleOAuth}
                    disabled={loading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
