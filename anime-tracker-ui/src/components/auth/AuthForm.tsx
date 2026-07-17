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
import { sanitizeInput } from "@/lib/sanitize";
import {
  validateSignIn,
  validateSignUp,
  validateRedirectTo,
} from "@/lib/validations/auth";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type AuthStep = "signin" | "signup";
type FormError = { message: string };

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
  const [error, setError] = useState<FormError | null>(null);
  const [loading, setLoading] = useState(false);
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

  /* ---- Sign in ---- */
  const handleSignIn = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      const validation = validateSignIn(email, password);
      if (!validation.valid) {
        setError({ message: validation.message });
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
            setError({ message: "Correo o contraseña incorrectos." });
          } else {
            setError({ message: signInError.message });
          }
          return;
        }

        router.push(safeRedirect);
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

      const validation = validateSignUp(email, username, password);
      if (!validation.valid) {
        setError({ message: validation.message });
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

    const safeRedirect = validateRedirectTo(redirectTo);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(safeRedirect)}`,
        },
      });

      if (oauthError) {
        setError({
          message: `Error en OAuth: ${oauthError.message}. Verifica que las URLs de redirección en Supabase estén configuradas.`,
        });
      }
    } catch {
      setError({
        message:
          "Error al iniciar sesión con Google. Revisa la configuración de OAuth en el panel de Supabase (URLs de redirección y orígenes autorizados).",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, redirectTo]);

  /* ---- Toggle signin / signup ---- */
  const toggleStep = () => {
    setStep((prev) => (prev === "signin" ? "signup" : "signin"));
    setError(null);
    setPassword("");
    setUsername("");
    setSuccessMessage(null);
  };

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
            Sigue lo que ves. Construye tu watchlist. Descubre tu próxima obsesión.
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
                    onChange={(v) => setEmail(sanitizeInput(v, 254))}
                    autoComplete="email"
                    disabled={loading}
                    autoFocus
                    icon="Mail"
                  />

                  <FloatingLabelInput
                    id="signin-password"
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={(v) => setPassword(sanitizeInput(v, 128))}
                    autoComplete="current-password"
                    disabled={loading}
                    icon="Lock"
                  />

                  {error && <FormBanner variant="error" message={error.message} />}

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
                    onChange={(v) => setUsername(sanitizeInput(v, 30))}
                    autoComplete="username"
                    disabled={loading}
                    autoFocus
                    icon="User"
                  />

                  <FloatingLabelInput
                    id="signup-email"
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={(v) => setEmail(sanitizeInput(v, 254))}
                    autoComplete="email"
                    disabled={loading}
                    icon="Mail"
                  />

                  <FloatingLabelInput
                    id="signup-password"
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={(v) => setPassword(sanitizeInput(v, 128))}
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={6}
                    icon="Lock"
                  />

                  {error && <FormBanner variant="error" message={error.message} />}
                  {successMessage && <FormBanner variant="success" message={successMessage} />}

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
        </motion.div>
      </motion.div>
    </div>
  );
}
