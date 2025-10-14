"use client";

import Link from "next/link";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/SearchBar";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex h-14 items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-500/10">
              <Film className="h-4 w-4 text-emerald-300" />
            </div>
            <span className="text-sm font-semibold">Anime Tracker</span>
          </Link>

          <nav className="ml-2 hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link href="/#season">Temporada</Link>
            <Link href="/#top">Top</Link>
          </nav>

          <div className="flex-1" />

          <div className="w-full max-w-xl">
            <SearchBar />
          </div>
        </div>
      </div>
    </header>
  );
}
