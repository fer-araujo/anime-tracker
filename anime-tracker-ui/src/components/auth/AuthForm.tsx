"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { checkEmailExists } from "@/actions/auth";
import type { IconName } from "@/components/custom/Icon";
import Icon from "@/components/custom/Icon";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type AuthStep = "email" | "signin" | "signup";
type FormError = { message: string };

/* -------------------------------------------------------------------------- */
/*  Immersive background — full-screen gradient with multiple orbs             */
/* -------------------------------------------------------------------------- */

function ImmersiveBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-background" />
      <div className="absolute -top-[40%] -left-[30%] w-[80%] h-[80%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(142_72%_45%/0.08)_0%,transparent_60%)] blur-[120px]" />
      <div className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(260_60%_50%/0.06)_0%,transparent_60%)] blur-[120px]" />
      <div className="absolute top-[10%] right-[5%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(200_70%_50%/0.05)_0%,transparent_60%)] blur-[100px]" />
      <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(320_50%_50%/0.04)_0%,transparent_60%)] blur-[80px]" />
      <div className="absolute inset-0 origin-bottom animate-glow-pulse will-change-transform bg-[radial-gradient(ellipse_140%_40%_at_50%_100%,hsl(142_72%_45%/0.03)_0%,transparent_60%)] motion-reduce:animate-none motion-reduce:opacity-30" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Premium input with inline icon                                             */
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
  icon,
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
  icon?: IconName;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-white/70 ml-1"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
        )}
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
          className={`h-12 w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 backdrop-blur-md transition-all focus:bg-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${icon ? "pl-11" : "px-4"} pr-4`}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Google OAuth button                                                        */
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
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      <span>Continuar con Google</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Divider                                                                    */
/* -------------------------------------------------------------------------- */

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs font-medium text-white/40 uppercase tracking-wider">o</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Error / Success banners                                                    */
/* -------------------------------------------------------------------------- */

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl bg-red-500/[0.06] border border-red-500/[0.12] px-4 py-3 text-sm text-red-300/80"
    >
      <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0 text-red-400/60" />
      <span>{message}</span>
    </motion.div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-300/80"
    >
      <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-emerald-400/60" />
      <span>{message}</span>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Email badge                                                                */
/* -------------------------------------------------------------------------- */

function EmailBadge({ email }: { email: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/50">
      <Icon name="Mail" size={13} className="text-white/30" />
      {email}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step transition                                                            */
/* -------------------------------------------------------------------------- */

const stepTransition: {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
  transition: Transition;
} = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
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

  /* ---- Handle OAuth callback errors ---- */
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError({
        message: "No se pudo completar el inicio de sesión. Intenta de nuevo.",
      });
    }
  }, [searchParams]);

  /* ---- Step 1: Submit email ---- */
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

  /* ---- Sign in ---- */
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
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login credentials")) {
            setError({ message: "Correo o contraseña incorrectos." });
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

  /* ---- Sign up ---- */
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
            setError({ message: "Este correo ya está registrado." });
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

        setSuccessMessage("¡Cuenta creada! Revisa tu correo para confirmar.");
      } catch {
        setError({ message: "Error inesperado. Intenta de nuevo." });
      } finally {
        setLoading(false);
      }
    },
    [email, password, username, supabase],
  );

  /* ---- Google OAuth ---- */
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

  const toggleAuthMode = () => {
    setError(null);
    setPassword("");
    setUsername("");
    setStep((prev) => (prev === "signin" ? "signup" : "signin"));
  };

  /* ========================================================================= */
  /*  RENDER                                                                   */
  /* ========================================================================= */

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 py-20">
      <ImmersiveBackground />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center"
      >
        {/* Hero typography */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Your anime,
            <br />
            elevated.
          </h1>
          <p className="mt-6 text-base text-white/30 max-w-sm mx-auto leading-relaxed">
            Track what you watch. Build your watchlist. Discover your next obsession.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <AnimatePresence mode="wait">
            {/* ================================================================ */}
            {/*  STEP: EMAIL                                                     */}
            {/* ================================================================ */}
            {step === "email" && (
              <motion.div key="email" {...stepTransition} className="space-y-6">
                <p className="text-center text-xs text-white/25 uppercase tracking-[0.2em] font-medium">
                  Comienza tu viaje
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                    icon="Mail"
                  />

                  {error && <ErrorBanner message={error.message} />}

                  <button
                    type="submit"
                    disabled={checkingEmail}
                    className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {checkingEmail ? (
                      <Icon name="Loader2" size={18} className="animate-spin" />
                    ) : (
                      <>
                        Continuar
                        <Icon name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <Divider />

                <GoogleOAuthButton
                  onClick={handleGoogleOAuth}
                  disabled={checkingEmail}
                />
              </motion.div>
            )}

            {/* ================================================================ */}
            {/*  STEP: SIGN IN                                                   */}
            {/* ================================================================ */}
            {step === "signin" && (
              <motion.div key="signin" {...stepTransition} className="space-y-6">
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                >
                  <Icon name="ChevronLeft" size={14} />
                  Otro correo
                </button>

                <div className="text-center space-y-3">
                  <EmailBadge email={email} />
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Bienvenido de vuelta
                  </h2>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
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
                    icon="Lock"
                  />

                  {error && <ErrorBanner message={error.message} />}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <Icon name="Loader2" size={18} className="animate-spin" />
                    ) : (
                      <>
                        Iniciar sesión
                        <Icon name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <Divider />

                <GoogleOAuthButton
                  onClick={handleGoogleOAuth}
                  disabled={loading}
                />

                {/* Toggle */}
                <p className="text-center text-sm text-white/50">
                  ¿No tienes una cuenta?{" "}
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    Regístrate
                  </button>
                </p>
              </motion.div>
            )}

            {/* ================================================================ */}
            {/*  STEP: SIGN UP                                                   */}
            {/* ================================================================ */}
            {step === "signup" && (
              <motion.div key="signup" {...stepTransition} className="space-y-6">
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                >
                  <Icon name="ChevronLeft" size={14} />
                  Otro correo
                </button>

                <div className="text-center space-y-3">
                  <EmailBadge email={email} />
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Crea tu cuenta
                  </h2>
                </div>

                <form onSubmit={handleSignUp} className="space-y-5">
                  <FormInput
                    id="step-signup-username"
                    label="Nombre de usuario"
                    value={username}
                    onChange={setUsername}
                    placeholder="tu_usuario"
                    autoComplete="username"
                    disabled={loading}
                    autoFocus
                    icon="User"
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
                    icon="Lock"
                  />

                  {error && <ErrorBanner message={error.message} />}
                  {successMessage && <SuccessBanner message={successMessage} />}

                  <button
                    type="submit"
                    disabled={loading || !!successMessage}
                    className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <Icon name="Loader2" size={18} className="animate-spin" />
                    ) : (
                      <>
                        Crear cuenta
                        <Icon name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <Divider />

                <GoogleOAuthButton
                  onClick={handleGoogleOAuth}
                  disabled={loading}
                />

                {/* Toggle */}
                <p className="text-center text-sm text-white/50">
                  ¿Ya tienes una cuenta?{" "}
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    Inicia sesión
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
