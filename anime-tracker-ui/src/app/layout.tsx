import "./globals.css";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Anime Tracker",
  description: "Temporada y plataformas de streaming",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className={cn("min-h-screen bg-background text-foreground")}>
        <header className="sticky top-0 z-40 backdrop-blur border-b border-neutral-800 bg-background/70">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Anime Tracker</h1>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
