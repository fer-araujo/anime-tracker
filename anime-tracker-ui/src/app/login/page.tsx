"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/custom/Icon";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular carga
    setTimeout(() => setLoading(false), 2000);
  };

  // Animaciones coreografiadas
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      
      {/* ================= LADO IZQUIERDO: ARTWORK CINEMÁTICO ================= */}
      <div className="relative hidden w-full items-center justify-center lg:flex lg:w-[55%]">
        {/* Imagen de fondo (Reemplaza con un backdrop real de TMDB) */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://image.tmdb.org/t/p/original/bKxiLPlrEpZPAuwKXKwuEeeT3hb.jpg')" }}
        />
        
        {/* Overlay de gradiente para fusionarlo con el lado derecho */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />

        {/* Texto flotante en el arte */}
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
            Descubre dónde ver <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
              tu próximo anime favorito.
            </span>
          </h2>
          <p className="text-lg text-white/60 max-w-lg">
            Sincroniza tus listas, encuentra plataformas oficiales y no te pierdas un solo episodio.
          </p>
        </motion.div>
      </div>

      {/* ================= LADO DERECHO: FORMULARIO GLASSMORPHISM ================= */}
      <div className="relative flex w-full items-center justify-center lg:w-[45%] bg-background">
        
        {/* Efectos de Resplandor (Glow) detrás del formulario */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 bottom-0 -z-10 h-[300px] w-[300px] rounded-full bg-purple-500/10 blur-[100px]" />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-[420px] px-8 sm:px-12 lg:px-8 xl:px-12"
        >
          {/* Cabecera Móvil (Solo visible en pantallas pequeñas) */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Icon name="Play" className="text-white ml-0.5" size={16} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Anime Tracker</span>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Bienvenido de vuelta</h1>
            <p className="text-sm text-white/50">Ingresa tus credenciales para continuar.</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div variants={itemVariants} className="space-y-4">
              {/* Input Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 ml-1">Correo electrónico</label>
                <div className="relative">
                  <Icon name="Mail" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    required
                    className="h-12 w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/30 backdrop-blur-md transition-all focus:bg-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-medium text-white/70">Contraseña</label>
                  <a href="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <Icon name="Lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    className="h-12 w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/30 backdrop-blur-md transition-all focus:bg-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
              </div>
            </motion.div>

            {/* Botón Principal */}
            <motion.div variants={itemVariants} className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading ? (
                  <Icon name="Loader2" className="animate-spin" size={18} />
                ) : (
                  <>
                    Iniciar Sesión
                    <Icon name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          {/* Separador */}
          <motion.div variants={itemVariants} className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">O continuar con</span>
            <div className="h-px flex-1 bg-white/10" />
          </motion.div>

          {/* Botones Sociales */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <Icon name="Github" size={18} />
              GitHub
            </button>
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <Icon name="Mail" size={18} />
              Google
            </button>
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemVariants} className="mt-10 text-center text-sm text-white/50">
            ¿No tienes una cuenta?{" "}
            <a href="#" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Regístrate
            </a>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
