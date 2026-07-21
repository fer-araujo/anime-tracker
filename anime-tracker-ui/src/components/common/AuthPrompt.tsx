"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface AuthPromptProps {
  onClose: () => void;
  onLoginNavigate: () => void;
}

/* -------------------------------------------------------------------------- */
/*  AuthPrompt                                                                 */
/* -------------------------------------------------------------------------- */

export function AuthPrompt({ onClose, onLoginNavigate }: AuthPromptProps) {
  // Mark as shown in sessionStorage on mount
  useEffect(() => {
    try {
      sessionStorage.setItem("auth_prompt_seen", "true");
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  }, []);

  const handleLogin = () => {
    try {
      sessionStorage.setItem("auth_prompt_seen", "true");
    } catch {
      // noop
    }
    onLoginNavigate();
    onClose();
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("auth_prompt_seen", "true");
    } catch {
      // noop
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col items-center text-center px-6 py-8 gap-4"
    >
      {/* Heading */}
      <h2
        id="auth-prompt-title"
        className="text-3xl font-bold text-white/90"
      >
        ¡Baka!
      </h2>

      {/* Body */}
      <p className="text-sm text-white/60 max-w-xs">
        Inicia sesión para añadir anime a tu lista
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full max-w-[240px]">
        <button
          type="button"
          autoFocus
          onClick={handleLogin}
          className="w-full px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-primary/60 cursor-pointer"
        >
          Inicia sesión
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
        >
          Seguir navegando
        </button>
      </div>
    </motion.div>
  );
}
