"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, User } from "lucide-react";
import SearchBar from "@/components/Search/SearchBar";
import { cn } from "@/lib/utils";
import { AnimeTrackerLogo } from "./Logo";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out",
        isScrolled
          ? "bg-background/50 backdrop-blur-2xl border-white/10 py-2 shadow-xl shadow-black/20"
          : "bg-gradient-to-b from-black/90 via-black/40 to-transparent py-4",
      )}
    >
      <div className="w-full flex items-center gap-4 md:gap-6 pl-6 md:pl-16 lg:pl-24 pr-[15vw] lg:pr-24">
        {/* LOGO */}
        {/* LOGO NUEVO Y PERSONALIZADO */}
        <Link href="/">
          <AnimeTrackerLogo />
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
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

        {/* ESPACIADOR FLUIDO */}
        <div className="flex-1" />

        {/* BUSCADOR */}
        <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
          <SearchBar />
        </div>

        {/* ICONOS EXTRA (Para el MVP) */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <button className="text-white/70 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:border-primary transition-colors cursor-pointer">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
