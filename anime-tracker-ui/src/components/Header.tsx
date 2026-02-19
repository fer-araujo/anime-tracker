"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Film, Bell, User } from "lucide-react";
import SearchBar from "@/components/Search/SearchBar";
import { cn } from "@/lib/utils";

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
        "fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-out",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b border-white/5 py-2 shadow-lg"
          : "bg-gradient-to-b from-black/80 via-black/40 to-transparent py-4",
      )}
    >
      {/* LA ALINEACIÓN MÁGICA:
        - pl-6 md:pl-16 lg:pl-24 -> Alinea exacto con donde empieza tu texto del Hero
        - pr-[15vw] lg:pr-24 -> Alinea exacto donde termina tu flecha derecha
      */}
      <div className="w-full flex items-center gap-4 md:gap-6 pl-6 md:pl-16 lg:pl-24 pr-[15vw] lg:pr-24">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-primary/30 bg-primary/10 transition-colors group-hover:border-primary/50 group-hover:bg-primary/20">
            <Film className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white group-hover:text-primary transition-colors hidden sm:block">
            Anime Tracker
          </span>
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
          <Link href="/#season" className="hover:text-white transition-colors">
            Temporada
          </Link>
          <Link href="/#top" className="hover:text-white transition-colors">
            Top
          </Link>
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
