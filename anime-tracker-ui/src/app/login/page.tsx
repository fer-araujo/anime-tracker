"use client";

import { useState, useCallback, useEffect, useMemo, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { checkEmailExists } from "@/actions/auth";
import Icon from "@/components/custom/Icon";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type AuthStep = "email" | "signin" | "signup";
type FormError = { message: string };
type Locale = "es" | "en";

/* -------------------------------------------------------------------------- */
/*  Translations                                                               */
/* -------------------------------------------------------------------------- */

const translations: Record<Locale, Record<string, string>> = {
  es: {
    headline1: "Tu anime,",
    headline2: "elevado.",
    subtitle:
      "Sigue lo que ves. Construye tu watchlist. Descubre tu próxima obsesión.",
    quote: "Los límites existen sólo si los aceptas.",
    beginJourney: "Comienza tu viaje",
    emailLabel: "Correo electrónico",
    emailPlaceholder: "tu@correo.com",
    continue: "Continuar",
    verifying: "Verificando…",
    or: "o",
    continueWithGoogle: "Continuar con Google",
    otherEmail: "Otro correo",
    welcomeBack: "Bienvenido de vuelta",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "••••••••",
    signIn: "Iniciar sesión",
    signingIn: "Iniciando sesión…",
    createAccount: "Crea tu cuenta",
    usernameLabel: "Nombre de usuario",
    usernamePlaceholder: "tu_usuario",
    createAccountBtn: "Crear cuenta",
    creatingAccount: "Creando cuenta…",
    accountCreated: "¡Cuenta creada! Revisa tu correo para confirmar.",
    emailRequired: "El correo electrónico es obligatorio",
    emailInvalid: "Correo electrónico inválido",
    passwordRequired: "La contraseña es obligatoria",
    usernameRequired: "El nombre de usuario es obligatorio",
    passwordTooShort: "La contraseña debe tener al menos 6 caracteres",
    oauthError: "No se pudo completar el inicio de sesión. Intenta de nuevo.",
    verifyError: "Error al verificar el correo. Intenta de nuevo.",
    unexpectedError: "Error inesperado. Intenta de nuevo.",
    wrongCredentials: "Correo o contraseña incorrectos.",
    alreadyRegistered: "Este correo ya está registrado.",
    weakPassword:
      "La contraseña es muy débil. Usa al menos 6 caracteres con mayúsculas, minúsculas y números.",
  },
  en: {
    headline1: "Your anime,",
    headline2: "elevated.",
    subtitle:
      "Track what you watch. Build your watchlist. Discover your next obsession.",
    quote: "Limits exist only if you accept them.",
    beginJourney: "Begin your journey",
    emailLabel: "Email address",
    emailPlaceholder: "you@email.com",
    continue: "Continue",
    verifying: "Verifying…",
    or: "or",
    continueWithGoogle: "Continue with Google",
    otherEmail: "Different email",
    welcomeBack: "Welcome back",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Sign in",
    signingIn: "Signing in…",
    createAccount: "Create your account",
    usernameLabel: "Username",
    usernamePlaceholder: "your_username",
    createAccountBtn: "Create account",
    creatingAccount: "Creating account…",
    accountCreated: "Account created! Check your email to confirm.",
    emailRequired: "Email is required",
    emailInvalid: "Invalid email address",
    passwordRequired: "Password is required",
    usernameRequired: "Username is required",
    passwordTooShort: "Password must be at least 6 characters",
    oauthError: "Could not complete sign in. Try again.",
    verifyError: "Error verifying email. Try again.",
    unexpectedError: "Unexpected error. Try again.",
    wrongCredentials: "Incorrect email or password.",
    alreadyRegistered: "This email is already registered.",
    weakPassword:
      "Password is too weak. Use at least 6 characters with uppercase, lowercase, and numbers.",
  },
};

function useLocale(): Locale {
  return useMemo(() => {
    if (typeof navigator === "undefined") return "es";
    const lang = navigator.language?.slice(0, 2)?.toLowerCase();
    return lang === "es" ? "es" : "en";
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Staggered entrance variants                                                */
/* -------------------------------------------------------------------------- */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const stepTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
} as const;

/* -------------------------------------------------------------------------- */
/*  Ambient glow orbs — right panel background                                 */
/* -------------------------------------------------------------------------- */

function AmbientGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(142_72%_45%/0.10)_0%,transparent_60%)] blur-[120px]" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(260_60%_50%/0.08)_0%,transparent_60%)] blur-[120px]" />
      <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(200_70%_50%/0.06)_0%,transparent_60%)] blur-[100px]" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form input                                                                 */
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
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-white/50 uppercase tracking-[0.15em]"
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
        className="h-11 w-full px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 transition-all duration-300 focus:bg-black/40 focus:border-primary/50 focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Google OAuth button                                                        */
/* -------------------------------------------------------------------------- */

function GoogleOAuthButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white/80 text-sm font-medium backdrop-blur-sm transition-all duration-300 hover:bg-white/10 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-3"
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
      <span>{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Divider                                                                    */
/* -------------------------------------------------------------------------- */

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <span className="text-xs text-white/30 uppercase tracking-[0.25em] font-medium">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Banners                                                                    */
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
      className="flex items-start gap-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-300/90"
    >
      <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-emerald-400/70" />
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

/* ========================================================================== */
/*  LoginPage                                                                  */
/* ========================================================================== */

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const locale = useLocale();
  const t = (key: string) => translations[locale][key] ?? key;

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
      setError({ message: t("oauthError") });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, locale]);

  /* ---- Step 1: Submit email ---- */
  const handleEmailSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmed = email.trim();
      if (!trimmed) {
        setError({ message: t("emailRequired") });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError({ message: t("emailInvalid") });
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
        setError({ message: t("verifyError") });
      } finally {
        setCheckingEmail(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [email, locale],
  );

  /* ---- Sign in ---- */
  const handleSignIn = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!password) {
        setError({ message: t("passwordRequired") });
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
            setError({ message: t("wrongCredentials") });
          } else {
            setError({ message: signInError.message });
          }
          return;
        }

        router.push(redirectTo);
        router.refresh();
      } catch {
        setError({ message: t("unexpectedError") });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [email, password, supabase, router, redirectTo, locale],
  );

  /* ---- Sign up ---- */
  const handleSignUp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!username.trim()) {
        setError({ message: t("usernameRequired") });
        return;
      }
      if (password.length < 6) {
        setError({ message: t("passwordTooShort") });
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
            setError({ message: t("alreadyRegistered") });
          } else if (signUpError.message.toLowerCase().includes("weak password")) {
            setError({ message: t("weakPassword") });
          } else {
            setError({ message: signUpError.message });
          }
          return;
        }

        setSuccessMessage(t("accountCreated"));
      } catch {
        setError({ message: t("unexpectedError") });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [email, password, username, supabase, locale],
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
      setError({ message: t("oauthError") });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, redirectTo, locale]);

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
    <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* =================================================================== */}
      {/*  LEFT PANEL — Artwork (55% desktop, hidden mobile)                  */}
      {/* =================================================================== */}
      <div className="hidden lg:flex relative w-[55%] min-h-screen overflow-hidden">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=2070&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

        {/* Floating quote block — bottom-left */}
        <div className="absolute bottom-10 left-10 right-16 z-10">
          <div className="inline-block backdrop-blur-md bg-black/20 rounded-2xl px-6 py-5 border border-white/[0.06]">
            <p className="text-lg text-white/80 font-light italic leading-relaxed max-w-sm">
              &ldquo;{t("quote")}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Icon name="Tv" size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Anime Tracker</p>
                <p className="text-xs text-white/40">Sigue tu viaje</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/*  RIGHT PANEL — Form (45% desktop, 100% mobile)                      */}
      {/* =================================================================== */}
      <div className="relative flex-1 lg:w-[45%] min-h-screen flex flex-col items-center justify-center px-6 py-12 lg:py-20 bg-background overflow-hidden">
        <AmbientGlow />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-md"
        >
          {/* Logo — visible on mobile where left panel is hidden */}
          <motion.div
            variants={itemVariants}
            className="lg:hidden flex items-center gap-3 mb-10 justify-center"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon name="Tv" size={18} className="text-primary" />
            </div>
            <span className="text-lg font-bold text-white/90">Anime Tracker</span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={itemVariants} className="text-center mb-10">
            <h1 className="text-[40px] md:text-[56px] font-bold tracking-tight text-white leading-[1.1]">
              {t("headline1")}
              <br />
              {t("headline2")}
            </h1>
            <p className="mt-4 text-base text-white/55 max-w-xs mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Form */}
          <motion.div variants={itemVariants}>
            <AnimatePresence mode="wait">
              {/* ============================================================== */}
              {/*  STEP: EMAIL                                                   */}
              {/* ============================================================== */}
              {step === "email" && (
                <motion.div key="email" {...stepTransition} className="space-y-5">
                  <p className="text-center text-[11px] text-white/45 uppercase tracking-[0.2em] font-medium">
                    {t("beginJourney")}
                  </p>

                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <FormInput
                      id="login-email"
                      label={t("emailLabel")}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder={t("emailPlaceholder")}
                      autoComplete="email"
                      disabled={checkingEmail}
                      autoFocus
                    />

                    {error && <ErrorBanner message={error.message} />}

                    <motion.button
                      type="submit"
                      disabled={checkingEmail}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="h-11 w-full rounded-xl font-semibold bg-primary text-primary-foreground text-sm transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(74,222,128,0.4)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {checkingEmail ? (
                        <Icon name="Loader2" size={16} className="animate-spin" />
                      ) : null}
                      {checkingEmail ? t("verifying") : t("continue")}
                    </motion.button>
                  </form>

                  <Divider label={t("or")} />

                  <GoogleOAuthButton
                    onClick={handleGoogleOAuth}
                    disabled={checkingEmail}
                    label={t("continueWithGoogle")}
                  />
                </motion.div>
              )}

              {/* ============================================================== */}
              {/*  STEP: SIGN IN                                                 */}
              {/* ============================================================== */}
              {step === "signin" && (
                <motion.div key="signin" {...stepTransition} className="space-y-5">
                  <button
                    type="button"
                    onClick={goBackToEmail}
                    className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    <Icon name="ChevronLeft" size={14} />
                    {t("otherEmail")}
                  </button>

                  <div className="text-center space-y-3">
                    <EmailBadge email={email} />
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {t("welcomeBack")}
                    </h2>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-5">
                    <FormInput
                      id="login-signin-password"
                      label={t("passwordLabel")}
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder={t("passwordPlaceholder")}
                      autoComplete="current-password"
                      disabled={loading}
                      autoFocus
                    />

                    {error && <ErrorBanner message={error.message} />}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="h-11 w-full rounded-xl font-semibold bg-primary text-primary-foreground text-sm transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(74,222,128,0.4)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Icon name="Loader2" size={16} className="animate-spin" />
                      ) : null}
                      {loading ? t("signingIn") : t("signIn")}
                    </motion.button>
                  </form>

                  <Divider label={t("or")} />

                  <GoogleOAuthButton
                    onClick={handleGoogleOAuth}
                    disabled={loading}
                    label={t("continueWithGoogle")}
                  />
                </motion.div>
              )}

              {/* ============================================================== */}
              {/*  STEP: SIGN UP                                                 */}
              {/* ============================================================== */}
              {step === "signup" && (
                <motion.div key="signup" {...stepTransition} className="space-y-5">
                  <button
                    type="button"
                    onClick={goBackToEmail}
                    className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    <Icon name="ChevronLeft" size={14} />
                    {t("otherEmail")}
                  </button>

                  <div className="text-center space-y-3">
                    <EmailBadge email={email} />
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {t("createAccount")}
                    </h2>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-5">
                    <FormInput
                      id="login-signup-username"
                      label={t("usernameLabel")}
                      value={username}
                      onChange={setUsername}
                      placeholder={t("usernamePlaceholder")}
                      autoComplete="username"
                      disabled={loading}
                      autoFocus
                    />

                    <FormInput
                      id="login-signup-password"
                      label={t("passwordLabel")}
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder={t("passwordPlaceholder")}
                      autoComplete="new-password"
                      disabled={loading}
                      minLength={6}
                    />

                    {error && <ErrorBanner message={error.message} />}
                    {successMessage && <SuccessBanner message={successMessage} />}

                    <motion.button
                      type="submit"
                      disabled={loading || !!successMessage}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="h-11 w-full rounded-xl font-semibold bg-primary text-primary-foreground text-sm transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(74,222,128,0.4)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Icon name="Loader2" size={16} className="animate-spin" />
                      ) : null}
                      {loading ? t("creatingAccount") : t("createAccountBtn")}
                    </motion.button>
                  </form>

                  <Divider label={t("or")} />

                  <GoogleOAuthButton
                    onClick={handleGoogleOAuth}
                    disabled={loading}
                    label={t("continueWithGoogle")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
