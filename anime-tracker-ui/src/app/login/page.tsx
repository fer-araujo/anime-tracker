"use client";

import { motion } from "framer-motion";
import Icon from "@/components/custom/Icon";
import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* ================= LADO IZQUIERDO: ARTWORK CINEMÁTICO ================= */}
      <div className="relative hidden w-full items-center justify-center lg:flex lg:w-[55%]">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://image.tmdb.org/t/p/original/bKxiLPlrEpZPAuwKXKwuEeeT3hb.jpg')" }}
        />

        {/* Overlay de gradiente para fusionar con el lado derecho */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />

        {/* Texto flotante */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative z-10 flex w-full max-w-2xl flex-col items-start justify-end p-12 h-full pb-24"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Icon name="Play" className="text-white ml-1" size={20} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Anime Tracker</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white/95 leading-tight mb-4">
            Descubre dónde ver{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
              tu próximo anime favorito.
            </span>
          </h2>
          <p className="text-lg text-white/60 max-w-lg">
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
