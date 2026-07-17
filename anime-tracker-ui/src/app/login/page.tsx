"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { AnimeTrackerLogo } from "@/components/Logo";
import AuthForm from "@/components/auth/AuthForm";

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

function AnimePatternOverlay() {
  const patterns = [
    <svg key="a" viewBox="0 0 100 100" width="80" height="80">
      <path d="M50 10 L85 85 L15 85 Z" fill="white" stroke="white" strokeWidth="2" />
      <line x1="30" y1="65" x2="70" y2="65" stroke="white" strokeWidth="3" />
    </svg>,
    <svg key="play" viewBox="0 0 100 100" width="80" height="80">
      <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="2" />
      <polygon points="42,32 42,68 72,50" fill="white" />
    </svg>,
    <svg key="eye" viewBox="0 0 100 100" width="80" height="80">
      <path d="M20 50 Q50 25 80 50 Q50 75 20 50 Z" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="50" cy="50" r="10" fill="white" opacity="0.5" />
    </svg>,
  ];

  const positions: { top: string; left: string; rotation: number; iconIdx: number }[] = [
    { top: "8%", left: "5%", rotation: 15, iconIdx: 0 },
    { top: "8%", left: "38%", rotation: -12, iconIdx: 1 },
    { top: "8%", left: "71%", rotation: 8, iconIdx: 2 },
    { top: "40%", left: "5%", rotation: -12, iconIdx: 2 },
    { top: "40%", left: "38%", rotation: 8, iconIdx: 0 },
    { top: "40%", left: "71%", rotation: 15, iconIdx: 1 },
    { top: "72%", left: "5%", rotation: 8, iconIdx: 1 },
    { top: "72%", left: "38%", rotation: 15, iconIdx: 2 },
    { top: "72%", left: "71%", rotation: -12, iconIdx: 0 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute opacity-[0.03]"
          style={{
            top: pos.top,
            left: pos.left,
            transform: `rotate(${pos.rotation}deg)`,
          }}
        >
          {patterns[pos.iconIdx]}
        </div>
      ))}
    </div>
  );
}

// 12 URLs para evitar patrones obvios
const posters = [
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx178789-hNXjKFzUq7mk.jpg", // Mushoku Tensei
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199111-gBSuBG61ElcW.jpg", // Grand Blue
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx135865-T7XIPMAbqcxN.png", // Tanya
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx196187-0dgFi2CPp3xn.jpg", // Smoking Behind Supermarket
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx210031-TppgcHZh46LY.jpg", // Polar Opposites
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx190569-KnCQLI3Z8hPX.jpg", // Jaadugar
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx200637-QLR5uv9SbQ69.jpg", // 100 Girlfriends
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx177699-hnzc1CS5ZSM2.png", // GHOST IN THE SHELL
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx198946-IGXmbqBEYRYD.jpg", // Clevatess
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx187260-WW5RBa5NINRP.jpg", // Till Your Dying Day
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx103303-IF43hFJPPv2Y.png", // Sparks of Tomorrow
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx187538-fXVXKYUA3VV6.jpg", // BLACK TORCH
];

// Configuración matemática del Grid (Más fácil de mantener)
const GRID_ITEMS = [
  // Columna 1
  { x: 0, y: 0, opacity: 0.1, imgIdx: 0 },
  { x: 0, y: 180, opacity: 0.25, imgIdx: 1 },
  { x: 0, y: 360, opacity: 0.12, imgIdx: 2 },
  { x: 0, y: 540, opacity: 0.05, imgIdx: 3 },
  // Columna 2 (Desfasada en Y para el efecto Masonry)
  { x: 130, y: -90, opacity: 0.08, imgIdx: 4 },
  { x: 130, y: 90, opacity: 0.3, imgIdx: 5 },
  { x: 130, y: 270, opacity: 0.15, imgIdx: 6 },
  { x: 130, y: 450, opacity: 0.2, imgIdx: 7 },
  { x: 130, y: 630, opacity: 0.07, imgIdx: 8 },
  // Columna 3
  { x: 260, y: 0, opacity: 0.22, imgIdx: 9 },
  { x: 260, y: 180, opacity: 0.1, imgIdx: 10 },
  { x: 260, y: 360, opacity: 0.28, imgIdx: 11 },
  { x: 260, y: 540, opacity: 0.05, imgIdx: 0 },
  // Columna 4 (Desfasada en Y)
  { x: 390, y: -90, opacity: 0.18, imgIdx: 1 },
  { x: 390, y: 90, opacity: 0.08, imgIdx: 2 },
  { x: 390, y: 270, opacity: 0.25, imgIdx: 3 },
  { x: 390, y: 450, opacity: 0.12, imgIdx: 4 },
  { x: 390, y: 630, opacity: 0.2, imgIdx: 5 },
];

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* ================= LADO IZQUIERDO: CINEMÁTICO ================= */}
      <div className="relative hidden w-full items-center justify-center lg:flex lg:w-[55%] bg-background overflow-hidden">
        {/* Placeholder visual — orbes de glassmorphism */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background z-0" />
        <div className="absolute -top-1/2 -left-1/4 w-[100%] h-[100%] rounded-full bg-primary/[0.03] blur-[150px] z-0" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[80%] h-[80%] rounded-full bg-white/[0.02] blur-[120px] z-0" />

        {/* ========================================================= */}
        {/* MURO DE POSTERS DINÁMICOS REFACTORIZADO CON .map()        */}
        {/* ========================================================= */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -inset-[80%] origin-center -rotate-[15deg] opacity-80">
            <svg width="100%" height="100%">
              <defs>
                <clipPath id="poster-radius">
                  <rect width="110" height="160" rx="10" />
                </clipPath>

                <pattern
                  id="hero-poster-grid"
                  width="520"
                  height="720"
                  patternUnits="userSpaceOnUse"
                >
                  {/* MAGIA AQUÍ: 18 líneas se resumen a esto 👇 */}
                  {GRID_ITEMS.map((item, idx) => (
                    <g key={idx} transform={`translate(${item.x}, ${item.y})`}>
                      <rect
                        width="110"
                        height="160"
                        rx="10"
                        fill="rgba(255,255,255,0.01)"
                      />
                      <image
                        href={posters[item.imgIdx]}
                        width="110"
                        height="160"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="url(#poster-radius)"
                        opacity={item.opacity}
                      />
                    </g>
                  ))}
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-poster-grid)" />
            </svg>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ANIME PATTERN OVERLAY                                      */}
        {/* ========================================================= */}
        <AnimePatternOverlay />

        {/* ========================================================= */}
        {/* OVERLAYS OSCUROS (Para hundir el muro completamente)      */}
        {/* ========================================================= */}
        <div className="absolute inset-0 bg-background/20 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/60 to-background z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 opacity-90 z-10" />

        {/* ========================================================= */}
        {/* Contenido Frontal */}
        {/* ========================================================= */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative z-20 flex w-full max-w-2xl flex-col items-start justify-end p-12 h-full pb-24"
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
      <div className="relative flex w-full items-center justify-center lg:w-[45%] bg-background">
        <Suspense fallback={<AuthSkeleton />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
