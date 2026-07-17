"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/custom/Icon";
import SearchBar from "@/components/Search/SearchBar";
import { cn } from "@/lib/utils";
import { AnimeTrackerLogo } from "./Logo";
import { useAuth } from "@/providers/AuthProvider";

export default function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { user, loading, signOut } = useAuth();

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

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
    router.refresh();
  };

  // Hide on auth pages — standalone layout
  if (pathname.startsWith("/auth") || pathname.startsWith("/login")) return null;

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
          <Link href="/season" className="hover:text-white transition-colors">
            Temporada
          </Link>
        </nav>

        <div className="hidden md:flex flex-1" />

        {/* BUSCADOR DESKTOP */}
        <div className="hidden md:block w-full min-w-[120px] max-w-[200px] lg:max-w-md xl:max-w-lg z-10">
          <SearchBar />
        </div>

        {/* ICONOS EXTRA (Solo Desktop) */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4 shrink-0">
          {/* User section */}
          <div className="relative" ref={userMenuRef}>
            {loading ? null : user ? (
              <>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold hover:bg-primary/30 transition-colors cursor-pointer uppercase"
                  aria-label="Menú de usuario"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    (user.email?.charAt(0) ?? "?")
                  )}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-neutral-950/95 backdrop-blur-2xl shadow-xl shadow-black/30 py-2 z-50">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-sm text-white/90 truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/watchlist"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Icon name="List" size={16} />
                      Watchlist
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Icon name="LogOut" size={16} />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="relative inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl text-[13px] font-medium text-white/70 hover:text-white hover:border-primary/30 hover:bg-primary/[0.06] hover:shadow-[0_0_20px_rgba(74,222,128,0.15)] transition-all duration-300 active:scale-[0.97]"
              >
                <Icon name="User" size={13} />
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>

        {/* ICONOS MOBILE (Lupa + Hamburguesa) */}
        <div className="md:hidden flex items-center gap-3 z-10">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-white/80 hover:text-white p-1"
            aria-label="Buscar"
          >
            <Icon name="Search" size={20} />
          </button>

          <button
            className="text-white/80 hover:text-white p-1 transition-transform active:scale-95"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Alternar menú"
          >
            {isMobileMenuOpen ? (
              <Icon name="X" size={24} />
            ) : (
              <Icon name="Menu" size={24} />
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
          <Link
            href="/season"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-left py-2 hover:text-white transition-colors"
          >
            Temporada
          </Link>

          <div className="w-full h-[1px] bg-white/10 my-2" />

          <div className="flex items-center gap-6 pt-2 pb-2">
            {user ? (
              <>
                <Link
                  href="/watchlist"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Icon name="List" size={20} />
                  <span>Watchlist</span>
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                    router.refresh();
                  }}
                  className="flex items-center gap-2 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Icon name="LogOut" size={20} />
                  <span>Cerrar sesión</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <Icon name="User" size={20} />
                <span>Iniciar sesión</span>
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
