"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { FloatingLabelInput } from "@/components/custom/FloatingLabelInput";
import { FormBanner } from "@/components/common/FormBanner";
import { Divider } from "@/components/common/Divider";
import { GoogleOAuthButton } from "@/components/common/GoogleOAuthButton";
import { AuthBackground } from "@/components/common/AuthBackground";
import { SubmitButton } from "@/components/common/SubmitButton";
import { LegalModal } from "@/components/legal/LegalModal";
import { sanitizeInput } from "@/lib/sanitize";
import {
  validateSignIn,
  validateSignUp,
  validateRedirectTo,
} from "@/lib/validations/auth";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type AuthStep = "signin" | "signup";

/* -------------------------------------------------------------------------- */
/*  Step transition                                                            */
/* -------------------------------------------------------------------------- */

const stepTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2, ease: "easeInOut" },
} as const;

/* ========================================================================== */
/*  AuthForm                                                                   */
/* ========================================================================== */

export default function AuthForm({ standalone = true }: { standalone?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [step, setStep] = useState<AuthStep>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const supabase = createClient();

  /* ---- Clear all field errors ---- */
  const clearErrors = useCallback(() => {
    setEmailError(null);
    setPasswordError(null);
    setUsernameError(null);
    setGenericError(null);
  }, []);

  /* ---- Handle OAuth callback errors ---- */
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setGenericError("No se pudo completar el inicio de sesión. Intenta de nuevo.");
    }
  }, [searchParams]);

  /* ---- Sign in ---- */
  const handleSignIn = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      clearErrors();

      const validation = validateSignIn(email, password);
      if (!validation.valid) {
        if (validation.message.toLowerCase().includes("correo")) {
          setEmailError(validation.message);
        } else {
          setPasswordError(validation.message);
        }
        return;
      }

      const safeRedirect = validateRedirectTo(redirectTo);

      setLoading(true);
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login credentials")) {
            setEmailError("Correo o contraseña incorrectos.");
            setPasswordError("Correo o contraseña incorrectos.");
          } else {
            setGenericError(signInError.message);
          }
          return;
        }

        router.push(safeRedirect);
        router.refresh();
      } catch {
        setGenericError("Error inesperado. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, supabase, router, redirectTo, clearErrors],
  );

  /* ---- Sign up ---- */
  const handleSignUp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      clearErrors();

      const validation = validateSignUp(email, username, password);
      if (!validation.valid) {
        if (validation.message.toLowerCase().includes("correo")) {
          setEmailError(validation.message);
        } else if (
          validation.message.toLowerCase().includes("nombre de usuario")
        ) {
          setUsernameError(validation.message);
        } else {
          setPasswordError(validation.message);
        }
        return;
      }

      setLoading(true);
      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim() },
            emailRedirectTo: `${getSiteUrl()}/auth/callback?redirect_to=/login`,
          },
        });

        if (signUpError) {
          if (
            signUpError.message.toLowerCase().includes("already registered") ||
            signUpError.message.toLowerCase().includes("already exists")
          ) {
            setEmailError("Este correo ya está registrado.");
          } else if (
            signUpError.message.toLowerCase().includes("weak password") ||
            signUpError.message.toLowerCase().includes("password")
          ) {
            setPasswordError(
              "La contraseña es muy débil. Usa al menos 6 caracteres con mayúsculas, minúsculas y números.",
            );
          } else {
            setGenericError(signUpError.message);
          }
          return;
        }

        setSuccessMessage("¡Cuenta creada! Revisa tu correo para confirmar.");
      } catch {
        setGenericError("Error inesperado. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, username, supabase, clearErrors],
  );

  /* ---- Google OAuth ---- */
  const handleGoogleOAuth = useCallback(async () => {
    clearErrors();
    setLoading(true);

    const safeRedirect = validateRedirectTo(redirectTo);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getSiteUrl()}/auth/callback?redirect_to=${encodeURIComponent(safeRedirect)}`,
        },
      });

      if (oauthError) {
        setGenericError(
          `Error en OAuth: ${oauthError.message}. Verifica que las URLs de redirección en Supabase estén configuradas.`,
        );
      }
    } catch {
      setGenericError(
        "Error al iniciar sesión con Google. Revisa la configuración de OAuth en el panel de Supabase (URLs de redirección y orígenes autorizados).",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, redirectTo, clearErrors]);

  /* ---- Toggle signin / signup ---- */
  const toggleStep = () => {
    setStep((prev) => (prev === "signin" ? "signup" : "signin"));
    clearErrors();
    setPassword("");
    setUsername("");
    setSuccessMessage(null);
  };

  /* ---- Field change handlers (clear inline error on edit) ---- */
  const handleEmailChange = useCallback((v: string) => {
    setEmail(sanitizeInput(v, 254));
    setEmailError(null);
  }, []);

  const handlePasswordChange = useCallback((v: string) => {
    setPassword(sanitizeInput(v, 128));
    setPasswordError(null);
  }, []);

  const handleUsernameChange = useCallback((v: string) => {
    setUsername(sanitizeInput(v, 30));
    setUsernameError(null);
  }, []);

  /* ========================================================================= */
  /*  RENDER                                                                   */
  /* ========================================================================= */

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-8 py-20">
      {standalone && <AuthBackground />}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[460px] flex flex-col items-center"
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-[1.15]">
            Tu anime, elevado.
          </h1>
          <p className="mt-3 text-sm text-white/40 max-w-xs mx-auto leading-relaxed">
            Sigue lo que ves. Construye tu tracking. Descubre tu próxima obsesión.
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
            {/*  SIGN IN                                                         */}
            {/* ================================================================ */}
            {step === "signin" && (
              <motion.div key="signin" {...stepTransition} className="space-y-5">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <FloatingLabelInput
                    id="signin-email"
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    autoComplete="email"
                    disabled={loading}
                    autoFocus
                    icon="Mail"
                    error={emailError}
                  />

                  <FloatingLabelInput
                    id="signin-password"
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    disabled={loading}
                    icon="Lock"
                    error={passwordError}
                  />

                  {genericError && <FormBanner variant="error" message={genericError} />}

                  <SubmitButton
                    label="Iniciar sesión"
                    loading={loading}
                    disabled={loading}
                  />
                </form>

                <Divider />

                <GoogleOAuthButton
                  onClick={handleGoogleOAuth}
                  disabled={loading}
                />

                <p className="text-center text-sm text-white/50">
                  Baka... ¿aún sin cuenta?{" "}
                  <button
                    type="button"
                    onClick={toggleStep}
                    className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    Regístrate
                  </button>
                </p>
              </motion.div>
            )}

            {/* ================================================================ */}
            {/*  SIGN UP                                                         */}
            {/* ================================================================ */}
            {step === "signup" && (
              <motion.div key="signup" {...stepTransition} className="space-y-5">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <FloatingLabelInput
                    id="signup-username"
                    label="Nombre de usuario"
                    value={username}
                    onChange={handleUsernameChange}
                    autoComplete="username"
                    disabled={loading}
                    autoFocus
                    icon="User"
                    error={usernameError}
                  />

                  <FloatingLabelInput
                    id="signup-email"
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    autoComplete="email"
                    disabled={loading}
                    icon="Mail"
                    error={emailError}
                  />

                  <FloatingLabelInput
                    id="signup-password"
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={6}
                    icon="Lock"
                    error={passwordError}
                  />

                  {genericError && <FormBanner variant="error" message={genericError} />}
                  {successMessage && <FormBanner variant="success" message={successMessage} />}

                  <label className="flex items-start gap-2 text-xs text-white/50">
                    <input type="checkbox" required className="mt-0.5 accent-primary" />
                    Acepto los{" "}
                    <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline cursor-pointer">
                      términos
                    </button>{" "}
                    y{" "}
                    <button type="button" onClick={() => setShowPrivacy(true)} className="text-primary hover:underline cursor-pointer">
                      política de privacidad
                    </button>
                  </label>

                  <SubmitButton
                    label="Crear cuenta"
                    loading={loading}
                    disabled={loading || !!successMessage}
                  />
                </form>

                <Divider />

                <GoogleOAuthButton
                  onClick={handleGoogleOAuth}
                  disabled={loading}
                />

                <p className="text-center text-sm text-white/50">
                  ¿Ya viste suficiente?{" "}
                  <button
                    type="button"
                    onClick={toggleStep}
                    className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    Inicia sesión
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legal modals */}
          <LegalModal type="terms" isOpen={showTerms} onClose={() => setShowTerms(false)} />
          <LegalModal type="privacy" isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
        </motion.div>
      </motion.div>
    </div>
  );
}
