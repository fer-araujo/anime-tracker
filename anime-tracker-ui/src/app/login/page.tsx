"use client";

import { motion } from "framer-motion";
import { AnimeTrackerLogo } from "@/components/Logo";
import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* ================= LADO IZQUIERDO: CINEMÁTICO ================= */}
      <div className="relative hidden w-full items-center justify-center lg:flex lg:w-[55%]">
        {/* Placeholder visual — fondo oscuro con sutiles orbes */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />
        <div className="absolute -top-1/2 -left-1/4 w-[100%] h-[100%] rounded-full bg-primary/[0.03] blur-[150px]" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[80%] h-[80%] rounded-full bg-white/[0.02] blur-[120px]" />

        {/* Overlay para fusionar con el lado derecho */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />

        {/* Contenido */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative z-10 flex w-full max-w-2xl flex-col items-start justify-end p-12 h-full pb-24"
        >
          <div className="mb-8">
            <AnimeTrackerLogo />
          </div>

          <h2 className="text-4xl font-bold tracking-tight text-white/90 leading-tight mb-4">
            Descubre dónde ver{" "}
            <span className="text-primary">
              tu próximo anime favorito.
            </span>
          </h2>

          <p className="text-base text-white/50 max-w-lg leading-relaxed">
            Sincroniza tus listas, encuentra plataformas oficiales y no te pierdas un solo episodio.
          </p>
        </motion.div>
      </div>

      {/* ================= LADO DERECHO: AUTHFORM ================= */}
      <div className="relative flex w-full items-center justify-center lg:w-[45%] bg-background">
        <AuthForm />
      </div>
    </div>
  );
}
