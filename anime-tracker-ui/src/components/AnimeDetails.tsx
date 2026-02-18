"use client";
import React, { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Play,
  Plus,
  Star,
  Calendar,
  Clock,
  Tv,
  MonitorPlay,
} from "lucide-react";
import { Anime } from "@/types/anime";
import { cn } from "@/lib/utils";

export default function AnimeDetailsPage({ anime }: { anime: Anime }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Parallax suave para el banner
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // 1. DETERMINAMOS LA IMAGEN HERO
  // Buscamos cualquier imagen horizontal de alta calidad
  const heroImage =
    anime.images.backdrop || anime.images.banner || anime.images.artworkCandidates?.[0]?.url_1280;

  // 2. DECIDIMOS QUÉ IMAGEN MOSTRAR REALMENTE
  // Si no hay ninguna horizontal, caemos al póster (que es vertical y necesitará blur)
  const displayImage = heroImage || anime.images.poster;

  // 3. ¿NECESITAMOS BLUR?
  // Solo aplicamos el "Blur Extremo" si NO encontramos una imagen Hero (es decir, estamos usando el póster)
  const needsBlur = !heroImage;

  return (
    <div
      ref={ref}
      className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground"
    >
      {/* ================= HERO SECTION (CINEMÁTICO) ================= */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        {/* Backdrop Image con Parallax */}
        {/* 1. LAYER DE FONDO (Imagen con Máscara) */}
        <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
          {/* WRAPPER CON MÁSCARA: La magia ocurre aquí */}
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]">
            {displayImage ? (
              <Image
                // 1. Backdrop (Calidad Premium TMDB)
                // 2. Banner (AniList, suele ser peor calidad)
                // 3. Fallback
                src={heroImage || ""}
                alt="Backdrop"
                quality={95} // Forzar calidad alta en Next.js
                priority
                fill
                className={cn(
                  "object-cover object-[center_25%] transition-all duration-700",
                  needsBlur
                    ? "blur-[80px] scale-110 opacity-50"
                    : "opacity-100",
                )}
              />
            ) : null}

            {/* Overlay Gradiente: Se funde con el color de fondo exacto del tema */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

            {/* Overlay de Grano dentro de la máscara para que también se desvanezca */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          </div>

          {/* Gradiente inferior de seguridad (para asegurar que el texto sea legible) */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          {/* Viñeta lateral (opcional, da profundidad) */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-background/80" />
        </motion.div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full z-10 px-6 md:px-16 pb-12 md:pb-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            {/* Columna vacía para dejar espacio al póster que viene abajo */}
            <div className="hidden md:block md:col-span-3 lg:col-span-3" />

            {/* Título y Metadatos Gigantes */}
            <div className="md:col-span-9 lg:col-span-9 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {/* Badges estéticos */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-white border border-white/10">
                    {anime?.meta?.status}
                  </span>
                  <span>{anime.meta?.year}</span>
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  <span>{anime.meta?.studio}</span>
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  <span>TV Series</span>
                </div>

                {/* Título Principal */}
                {anime.images?.logo ? (
                              <motion.div
                                key={`logo-${anime.id.anilist}`}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                className="relative h-24 md:h-40 lg:h-48 w-full max-w-2xl mb-6"
                              >
                                <Image
                                  src={anime.images.logo}
                                  alt={anime.title}
                                  fill
                                  // object-left-bottom: Alineado a la izquierda y abajo.
                                  className="object-contain object-left-bottom"
                                  priority
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                />
                              </motion.div>
                            ) : (
                              // Fallback Título
                              <motion.h2
                                key={`title-${anime.id.anilist}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg leading-tight mb-4"
                              >
                                {anime.title}
                              </motion.h2>
                            )}

                {/* Subtítulo (ej. Season name) */}
                {anime.meta?.season && (
                  <p className="text-2xl md:text-3xl text-muted-foreground mt-2 font-light">
                    {anime.meta?.season}
                  </p>
                )}
              </motion.div>

              {/* Botones de Acción (Hero) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="flex flex-wrap gap-4 pt-4"
              >
                <button className="group flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-bold hover:brightness-110 transition-all shadow-[0_0_20px_-5px_var(--color-primary)]">
                  <Play className="w-6 h-6 fill-current" />
                  Ver Trailer
                </button>
                <button className="group flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 text-white px-6 py-4 rounded-full text-lg font-medium hover:bg-white/10 transition-all">
                  <Plus className="w-6 h-6" />
                  Añadir a lista
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CONTENIDO PRINCIPAL (THE BODY) ================= */}
      <main className="relative z-20 max-w-7xl mx-auto px-6 md:px-16 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* --- COLUMNA IZQUIERDA (STICKY) --- */}
          <div className="md:col-span-3 lg:col-span-3 relative">
            <div className="md:-mt-48 sticky top-8">
              {" "}
              {/* Margen negativo para el efecto "Bridge" */}
              {/* El Póster Flotante */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/5 group"
              >
                <Image
                  src={anime.images.poster || ""}
                  alt={anime.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Brillo en hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
              {/* Stats Rápidos debajo del poster */}
              <div className="mt-8 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-white/5">
                  <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-primary fill-primary" />
                    <span className="text-xl font-bold text-white">
                      {anime.meta?.score}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">
                    Score
                  </span>
                </div>

                {/* Info Grid Pequeño */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Episodios</p>
                    <p className="text-white font-semibold">
                      {anime.meta?.episodes}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Duración</p>
                    <p className="text-white font-semibold">24m</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- COLUMNA DERECHA (SCROLLABLE INFO) --- */}
          <div className="md:col-span-9 lg:col-span-9 md:pt-12 space-y-16">
            {/* 1. Sinopsis Editorial */}
            <section>
              <h3 className="text-primary text-sm font-bold uppercase tracking-widest mb-6">
                Sinopsis
              </h3>
              <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-gray-300 font-light text-pretty">
                {anime.meta?.synopsis}
              </p>

              {/* Géneros Tags */}
              <div className="flex flex-wrap gap-2 mt-8">
                {(anime.meta?.genres ?? []).map((g) => (
                  <span
                    key={g}
                    className="px-4 py-1.5 rounded-lg border border-white/10 text-sm hover:border-primary/50 hover:text-primary transition-colors cursor-default"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </section>

            {/* 2. Providers (Monochrome to Color) */}
            <section>
              <h3 className="flex items-center gap-3 text-white text-xl font-semibold mb-6">
                <MonitorPlay className="w-5 h-5 text-primary" />
                Disponible en
              </h3>

              <div className="flex flex-wrap gap-4">
                {anime.providers.map((p) => (
                  <a
                    key={p}
                    href="#"
                    className="group relative flex items-center gap-4 pl-4 pr-6 py-3 rounded-xl bg-card border border-white/5 hover:border-white/20 transition-all overflow-hidden"
                  >
                    {/* Barra de color lateral (glow) */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300"
                      style={{ backgroundColor: p }}
                    />

                    {/* Placeholder de Logo (Usa tus logos reales) */}
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 group-hover:text-white transition-colors">
                      {p}
                    </div>

                    <span className="text-gray-400 font-medium group-hover:text-white transition-colors">
                      {p}
                    </span>
                  </a>
                ))}

                {/* Fallback si es pirata */}
                {anime.providers.length === 0 && (
                  <div className="px-6 py-3 rounded-xl bg-card border border-white/5 text-gray-500 italic">
                    No oficial providers found.
                  </div>
                )}
              </div>
            </section>

            {/* 3. Bento Grid Stats (Ejemplo) */}
            <section>
              <h3 className="text-white text-xl font-semibold mb-6">
                Detalles Técnicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1 */}
                <div className="p-6 rounded-2xl bg-muted/30 border border-white/5 hover:bg-muted/50 transition-colors">
                  <Calendar className="w-6 h-6 text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Estreno</p>
                  <p className="text-lg font-medium text-white">Oct 2023</p>
                </div>
                {/* Card 2 */}
                <div className="p-6 rounded-2xl bg-muted/30 border border-white/5 hover:bg-muted/50 transition-colors">
                  <Tv className="w-6 h-6 text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Formato</p>
                  <p className="text-lg font-medium text-white">TV Show</p>
                </div>
                {/* Card 3 */}
                <div className="p-6 rounded-2xl bg-muted/30 border border-white/5 hover:bg-muted/50 transition-colors">
                  <Clock className="w-6 h-6 text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Emisión</p>
                  <p className="text-lg font-medium text-white">Jueves</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
