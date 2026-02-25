"use client";
import React, { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Play,
  Plus,
  Star,
  Clock,
  Tv,
  MonitorPlay,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Calendar,
  Trophy,
} from "lucide-react";
import { Anime } from "@/types/anime";
import { cn, formatNextAiring } from "@/lib/utils";
import { GalleryLightbox } from "./common/Gallery";
import { MinimalShelf } from "./Shelf";
import { ImagePlaceholder } from "./common/ImagePlaceholder";

export default function AnimeDetailsPage({ anime }: { anime: Anime }) {
  const ref = useRef(null);
  const [activeTab, setActiveTab] = useState<string>("Detalles");
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgDarken = useTransform(
    scrollYProgress,
    [0, 0.5],
    ["rgba(0,0,0,0)", "rgba(0,0,0,0.95)"],
  );

  const uniqueProviders = useMemo(() => {
    const seen = new Set();
    return (anime.providers || []).filter((p) => {
      const base = p.split(" ")[0];
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    });
  }, [anime.providers]);

  const heroImage =
    anime.images.backdrop || anime.images.banner || anime.images.poster;

  const availableTabs = ["Detalles"];
  if (anime.episodesData && anime.episodesData.length > 0) {
    availableTabs.push("Episodios");
  }
  if (
    anime.images.artworkCandidates &&
    anime.images.artworkCandidates.length > 0
  ) {
    availableTabs.push("Galeria");
  }

  // Si por alguna razón la tab activa ya no está disponible, regresamos a Detalles
  if (!availableTabs.includes(activeTab)) {
    setActiveTab("Detalles");
  }

  return (
    <div
      ref={ref}
      className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary"
    >
      {/* LIGHTBOX */}
      {lightboxIndex !== null && anime.images.artworkCandidates && (
        <GalleryLightbox
          images={anime.images.artworkCandidates}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* BACKGROUND FIXED */}
      <div className="fixed top-0 left-0 w-full h-[85vh] z-0 pointer-events-none">
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]">
          <Image
            src={heroImage || ""}
            alt="Banner"
            fill
            priority
            className="object-cover object-[center_20%] opacity-40 md:opacity-50 xl:opacity-30"
          />
        </div>
        <motion.div
          style={{ backgroundColor: bgDarken }}
          className="absolute inset-0 z-10"
        />
      </div>

      <div className="relative z-10 w-full">
        {/* HERO CONTENT */}
        <section className="h-[70vh] md:h-[75vh] w-full relative">
          <div className="absolute bottom-32 md:bottom-40 left-0 w-full z-10">
            <div className="max-w-7xl mx-auto px-6 md:px-16 lg:px-24 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
              <div className="hidden md:block md:col-span-3 lg:col-span-3" />
              <div className="md:col-span-9 lg:col-span-9 flex flex-col items-start text-left">
                <div className="flex flex-wrap items-center gap-3 mb-6 text-[11px] font-semibold tracking-widest uppercase">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-md border backdrop-blur-md transition-colors",
                      anime?.meta?.status === "RELEASING"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-white/5 text-white/50 border-white/10",
                    )}
                  >
                    {anime?.meta?.status === "RELEASING"
                      ? "En Emisión"
                      : "Finalizado"}
                  </span>
                  <span className="text-white/70">{anime.meta?.year}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span className="text-white/70">{anime.meta?.studio}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span className="text-white/70">
                    {anime.meta?.type || "TV"}
                  </span>
                </div>

                {anime.images?.logo ? (
                  <div className="relative h-24 md:h-32 lg:h-40 w-full max-w-lg mb-4 mr-auto">
                    <Image
                      src={anime.images.logo}
                      alt={anime.title}
                      fill
                      className="object-contain object-left-bottom drop-shadow-2xl"
                      priority
                    />
                  </div>
                ) : (
                  <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-4 drop-shadow-md text-left">
                    {anime.title}
                  </h1>
                )}

                {anime.subtitle && (
                  <h2 className="text-xs md:text-sm font-medium text-white/40 tracking-widest mb-4 drop-shadow-md">
                    {anime.subtitle}
                  </h2>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <main className="relative z-20 bg-gradient-to-b from-transparent via-background to-background pt-12 -mt-24 md:-mt-32">
          <div className="max-w-7xl mx-auto px-6 md:px-16 lg:px-24 pb-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
              {/* COLUMNA IZQ (Póster) */}
              <div className="md:col-span-3 lg:col-span-3 relative">
                <div className="sticky top-28 space-y-6">
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-2xl border border-white/10 group bg-background">
                    {anime.images.poster ? (
                      <Image
                        src={anime.images.poster}
                        alt={anime.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>

                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                        Score
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-lg font-black text-white">
                          {anime.meta?.rating ? `${anime.meta.rating}` : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="h-px bg-white/5 mb-4" />
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white/40 uppercase tracking-widest">
                        Formato
                      </span>
                      <span className="font-medium text-white">
                        {anime.meta?.type || "TV"}
                      </span>
                    </div>
                    {/* AQUI QUITAMOS DURACIÓN Y PUSIMOS ESTUDIO */}
                    <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-white/5">
                      <span className="font-bold text-white/40 uppercase tracking-widest">
                        Estudio
                      </span>
                      <span
                        className="font-medium text-white truncate max-w-[120px] text-right"
                        title={anime.meta?.studio || "N/A"}
                      >
                        {anime.meta?.studio || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA DER */}
              <div className="md:col-span-9 lg:col-span-9 space-y-16">
                <div className="flex flex-wrap gap-4 justify-start">
                  {/* Condicional para el trailer */}
                  {anime.meta?.trailer && (
                    <a
                      href={anime.meta.trailer}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-primary/85 text-gray-100 border border-transparent px-7 py-3 rounded-lg text-sm font-bold hover:bg-primary transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" /> Ver trailer
                    </a>
                  )}

                  <button className="flex items-center gap-3 bg-transparent border border-white/10 text-white/70 px-7 py-3 rounded-lg text-sm font-semibold hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                    <Plus className="w-4 h-4" /> Añadir a lista
                  </button>
                </div>

                <section className="space-y-4 text-left">
                  <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
                    Sinopsis
                  </h3>
                  <div className="relative">
                    <p
                      className={cn(
                        "text-[1rem] md:text-[1.05rem] leading-relaxed text-white/80 font-normal max-w-4xl text-pretty transition-all duration-300",
                        !isSynopsisExpanded && "line-clamp-4",
                      )}
                    >
                      {anime.meta?.synopsis || "Sinopsis no disponible."}
                    </p>
                    {anime.meta?.synopsis &&
                      anime.meta.synopsis.length > 300 && (
                        <button
                          onClick={() =>
                            setIsSynopsisExpanded(!isSynopsisExpanded)
                          }
                          className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-primary hover:brightness-125 transition-colors uppercase tracking-[0.2em] cursor-pointer"
                        >
                          {isSynopsisExpanded ? "Mostrar menos" : "Leer más"}
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 transition-transform",
                              isSynopsisExpanded && "rotate-180",
                            )}
                          />
                        </button>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-4 justify-start">
                    {(anime.meta?.genres || []).map((g) => (
                      <span
                        key={g}
                        className="px-4 py-1.5 rounded-md border border-white/10 text-[10px] font-medium text-white/50 uppercase tracking-widest cursor-default hover:border-primary/30 hover:text-primary/80 transition-colors"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="space-y-6 pt-2">
                  <h3 className="text-white text-xl font-light tracking-wide flex items-center gap-3">
                    <MonitorPlay className="w-5 h-5 text-primary" /> Disponible
                    en
                  </h3>
                  <div className="flex flex-wrap gap-3 justify-start">
                    {uniqueProviders.map((p) => (
                      <div
                        key={p}
                        className="flex items-center px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.01] hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group shadow-sm"
                      >
                        <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                          {p}
                        </span>
                      </div>
                    ))}
                    {uniqueProviders.length === 0 && (
                      <div className="px-5 py-2.5 rounded-lg border border-dashed border-white/10 text-white/30 text-sm">
                        Sin plataformas oficiales
                      </div>
                    )}
                  </div>
                </section>

                {/* TABS Y DETALLES */}
                {/* TABS Y DETALLES */}
                <section className="space-y-6 pt-8 border-t border-white/5">
                  <div className="flex border border-white/10 p-1 rounded-lg bg-white/[0.01] w-fit">
                    {/* AQUI USAMOS LAS TABS DINÁMICAS */}
                    {availableTabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-6 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
                          activeTab === tab
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-white/40 hover:text-white/80 border border-transparent",
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Le damos un min-h-[250px] para empujar el scroll y que no quede el hueco en blanco */}
                  <div className="min-h-[140px]">
                    {/* Detalles (Con info real para rellenar) */}
                    {/* Detalles */}
                    {/* Detalles */}
                    {activeTab === "Detalles" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01]">
                          <Tv className="w-5 h-5 text-primary mb-6 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">
                            Total Eps.
                          </p>
                          <p className="text-xl font-light text-white">
                            {anime.meta?.episodes || "??"}
                          </p>
                        </div>

                        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01]">
                          <Clock className="w-5 h-5 text-primary mb-6 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">
                            Duración
                          </p>
                          <p className="text-xl font-light text-white">
                            {anime.meta?.duration
                              ? `${anime.meta.duration} min`
                              : "N/A"}
                          </p>
                        </div>

                        {/* TARJETA 3: Ranking (¡La nueva!) */}
                        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01]">
                          <Trophy className="w-5 h-5 text-primary mb-6 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">
                            {anime.meta?.ranking?.type === "RATED"
                              ? "Mejor Valorado"
                              : "Más Popular"}
                          </p>
                          <p className="text-xl font-light text-white">
                            {anime.meta?.ranking?.rank
                              ? `#${anime.meta.ranking.rank} Global`
                              : "N/A"}
                          </p>
                        </div>

                        {/* TARJETA 4: Próximo Ep / Año */}
                        {anime.meta?.nextAiring ? (
                          // Nota: Extraemos la info antes del return o directo aquí:
                          (() => {
                            const airingInfo = formatNextAiring(
                              anime.meta.nextAiring,
                              anime.meta.nextEpisodeAt,
                            );

                            return (
                              <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                                {/* 1. Icono arriba (Igual que las demás) */}
                                <MonitorPlay className="w-5 h-5 text-primary mb-6 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />

                                <div>
                                  {/* 2. Título en medio (Con el puntito de "en emisión") */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                      Próx. Ep. {airingInfo.ep}
                                    </p>
                                  </div>

                                  {/* 3. Valor principal abajo (Igual que las demás) */}
                                  <div className="flex flex-col">
                                    <p className="text-xl font-light text-white">
                                      {airingInfo.main}
                                    </p>
                                    {/* Dato secundario muy sutil para no saturar */}
                                    <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mt-0.5">
                                      {airingInfo.sub}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01]">
                            <Calendar className="w-5 h-5 text-primary mb-6 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">
                              Año
                            </p>
                            <p className="text-xl font-light text-white">
                              {anime.meta?.year || "N/A"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* RESTAURADO Y MEJORADO: Episodios con Scroll y Diseño Original */}
                    {activeTab === "Episodios" && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm text-white/50">
                            Episodios disponibles (
                            {anime.episodesData?.length || 0})
                          </p>
                        </div>

                        {/* El contenedor mágico: altura fija, scroll interno y scrollbar invisible/delgada */}
                        <div
                          className="space-y-3 max-h-[350px] overflow-y-auto pr-3 overflow-x-hidden 
                            [&::-webkit-scrollbar]:w-1.5 
                            [&::-webkit-scrollbar-track]:bg-transparent 
                            [&::-webkit-scrollbar-thumb]:bg-white/10 
                            [&::-webkit-scrollbar-thumb]:rounded-full 
                            hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
                        >
                          {anime.episodesData?.map((ep: any, i: number) => (
                            <a
                              href={ep.url}
                              target="_blank"
                              rel="noreferrer"
                              key={i}
                              className="flex items-center gap-4 p-3 rounded-lg border border-white/5 hover:bg-white/[0.04] cursor-pointer group transition-colors bg-white/[0.01]"
                            >
                              <div className="w-24 h-16 bg-white/5 rounded-md flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                {ep.thumbnail ? (
                                  <Image
                                    src={ep.thumbnail}
                                    alt={ep.title}
                                    fill
                                    className="object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                                  />
                                ) : (
                                  <Play className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                  <Play className="w-5 h-5 text-white/80 group-hover:text-primary transition-colors drop-shadow-md" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4
                                  className="text-sm font-semibold text-white/90 group-hover:text-white line-clamp-1"
                                  title={ep.title}
                                >
                                  {ep.title}
                                </h4>
                                <p className="text-xs text-white/40 mt-1 line-clamp-1">
                                  Ver episodio
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Galería */}
                    {activeTab === "Galeria" && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {anime.images.artworkCandidates
                          ?.slice(0, 6)
                          .map((img, i) => (
                            <div
                              key={i}
                              onClick={() => setLightboxIndex(i)}
                              className="relative aspect-video rounded-lg overflow-hidden border border-white/5 bg-white/5 group cursor-pointer"
                            >
                              {img.url_original ? (
                                <Image
                                  src={img.url_original}
                                  alt="Artwork"
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <ImagePlaceholder />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white/70" />
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* SECCIONES INFERIORES */}
            <div className="mt-20 space-y-10 border-t border-white/5 pt-12">
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-white text-xl font-light tracking-wide">
                    Animes Similares
                  </h3>
                  <button
                    onClick={() =>
                      alert(
                        "¡La página completa de recomendaciones estará disponible en la próxima actualización!",
                      )
                    }
                    className="text-xs text-white/40 uppercase tracking-widest font-bold flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
                  >
                    Ver más <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {anime.meta?.recommendations &&
                anime.meta?.recommendations.length > 0 ? (
                  <MinimalShelf items={anime.meta?.recommendations} title="" />
                ) : (
                  <div className="border border-dashed border-white/10 p-12 rounded-xl flex items-center justify-center bg-white/[0.01]">
                    <p className="text-white/30 text-sm font-medium">
                      Las recomendaciones se cargarán aquí tras conectar el
                      backend.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
