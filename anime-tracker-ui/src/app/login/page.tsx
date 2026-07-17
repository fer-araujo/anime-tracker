"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { AnimeTrackerLogo } from "@/components/Logo";
import AuthForm from "@/components/auth/AuthForm";
import SeasonAnimeGrid from "@/components/SeasonAnimeGrid";

// Fallback posters — se pasan a SeasonAnimeGrid como initial data,
// el componente refresca en background con los de temporada
const fallbackPosters = [
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx178789-hNXjKFzUq7mk.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199111-gBSuBG61ElcW.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx135865-T7XIPMAbqcxN.png",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx196187-0dgFi2CPp3xn.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx210031-TppgcHZh46LY.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx190569-KnCQLI3Z8hPX.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx200637-QLR5uv9SbQ69.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx177699-hnzc1CS5ZSM2.png",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx198946-IGXmbqBEYRYD.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx187260-WW5RBa5NINRP.jpg",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx103303-IF43hFJPPv2Y.png",
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx187538-fXVXKYUA3VV6.jpg",
];

function AuthSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 animate-pulse">
        <div className="mx-auto h-8 w-48 rounded bg-white/5" />
        <div className="mx-auto h-4 w-64 rounded bg-white/5" />
        <div className="mt-10 space-y-3">
          <div className="h-4 w-24 rounded bg-white/5" />
          <div className="h-12 w-full rounded-xl bg-white/5" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-white/5" />
          <div className="h-12 w-full rounded-xl bg-white/5" />
        </div>
        <div className="h-12 w-full rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

// Grid dinámico — SeasonAnimeGrid obtiene los primeros 15 animes de temporada

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* ================= LADO IZQUIERDO: CINEMÁTICO ================= */}
      <div className="relative hidden w-full items-center justify-center lg:flex lg:w-[50%] bg-background overflow-hidden">
        {/* Ambiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background z-0" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[80%] h-[80%] rounded-full bg-white/[0.015] blur-[120px] z-0" />

        {/* MURO DE POSTERS DINÁMICOS — SeasonAnimeGrid */}
        <SeasonAnimeGrid posters={fallbackPosters} />

        {/* Overlays suaves para que el texto se lea pero se vean los posters */}
        <div className="absolute inset-0 bg-background/[0.08] z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/20 z-10" />

        {/* ========================================================= */}
        {/* Contenido Frontal */}
        {/* ========================================================= */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative z-20 flex w-full max-w-xl flex-col items-start justify-end p-12 h-full pb-[24vh]"
        >
          <div className="mb-8">
            <AnimeTrackerLogo />
          </div>

          <h2 className="text-4xl font-bold tracking-tight text-white/90 leading-tight mb-4 drop-shadow-lg">
            Descubre dónde ver{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              tu próximo anime favorito.
            </span>
          </h2>

          <p className="text-base text-white/50 max-w-lg leading-relaxed drop-shadow-md">
            Sincroniza tus listas, encuentra plataformas oficiales y no te
            pierdas un solo episodio.
          </p>
        </motion.div>
      </div>

      {/* ================= LADO DERECHO: AUTHFORM ================= */}
      <div className="relative flex w-full items-center justify-center lg:w-[50%] bg-background">
        <Suspense fallback={<AuthSkeleton />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
