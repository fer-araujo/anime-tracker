"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, User, Menu, X, Search } from "lucide-react";
import SearchBar from "@/components/Search/SearchBar";
import { cn } from "@/lib/utils";
import { AnimeTrackerLogo } from "./Logo";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleScrollClose = () => {
      if (window.scrollY > 100) setIsMobileMenuOpen(false);
    };
    window.addEventListener("scroll", handleScrollClose);
    return () => window.removeEventListener("scroll", handleScrollClose);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out",
        isScrolled || isMobileMenuOpen
          ? "bg-neutral-950/80 backdrop-blur-xl border-b border-white/10 py-3 shadow-xl shadow-black/20"
          : "bg-gradient-to-b from-black/90 via-black/40 to-transparent py-4 md:py-5",
      )}
    >
      <div className="w-full flex items-center justify-between gap-3 md:gap-4 lg:gap-6 px-4 md:px-8 lg:px-16 xl:px-24">
        {/* LOGO */}
        <div className="shrink-0 z-10">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
            <AnimeTrackerLogo />
          </Link>
        </div>

        {/* NAV LINKS DESKTOP */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium text-white/70">
          <button
            onClick={() =>
              alert(
                "¡Próximamente! La página de Temporada estará lista en la versión 1.1 🚀",
              )
            }
            className="hover:text-white transition-colors cursor-pointer"
          >
            Temporada
          </button>
          <button
            onClick={() =>
              alert(
                "¡Próximamente! El Top Histórico estará disponible en la versión 1.1 🏆",
              )
            }
            className="hover:text-white transition-colors cursor-pointer"
          >
            Top
          </button>
        </nav>

        <div className="hidden md:flex flex-1" />

        {/* BUSCADOR DESKTOP */}
        <div className="hidden md:block w-full min-w-[120px] max-w-[200px] lg:max-w-md xl:max-w-lg z-10">
          <SearchBar />
        </div>

        {/* ICONOS EXTRA (Solo Desktop) */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4 shrink-0">
          <button className="text-white/70 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:border-primary transition-colors cursor-pointer">
            <User className="w-4 h-4" />
          </div>
        </div>

        {/* ICONOS MOBILE (Lupa + Hamburguesa) */}
        <div className="md:hidden flex items-center gap-3 z-10">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-white/80 hover:text-white p-1"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            className="text-white/80 hover:text-white p-1 transition-transform active:scale-95"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Alternar menú"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE MOBILE (Compacto y con lista normal) */}
      <div
        className={cn(
          "md:hidden absolute top-full left-0 w-full bg-neutral-950/95 backdrop-blur-2xl border-b border-white/10 flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-top",
          isMobileMenuOpen
            ? "max-h-[400px] opacity-100 py-4 px-6"
            : "max-h-0 opacity-0 py-0 px-6 border-transparent",
        )}
      >
        <div className="w-full mb-6">
          <SearchBar />
        </div>

        <nav className="flex flex-col gap-4 text-sm font-medium text-white/80">
          <button
            onClick={() =>
              alert(
                "¡Próximamente! La página de Temporada estará lista en la versión 1.1 🚀",
              )
            }
            className="text-left py-2 hover:text-white transition-colors"
          >
            Temporada
          </button>
          <button
            onClick={() =>
              alert(
                "¡Próximamente! El Top Histórico estará disponible en la versión 1.1 🏆",
              )
            }
            className="text-left py-2 hover:text-white transition-colors"
          >
            Top
          </button>

          <div className="w-full h-[1px] bg-white/10 my-2" />

          <div className="flex items-center gap-6 pt-2 pb-2">
            <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span>Notificaciones</span>
            </button>
            <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <User className="w-5 h-5" />
              <span>Mi Perfil</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
