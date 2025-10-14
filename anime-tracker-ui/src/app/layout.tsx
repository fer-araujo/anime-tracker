import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import "./globals.css";

export const metadata = {
  title: "Anime Tracker",
  description: "Temporada y plataformas de streaming",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className={cn("min-h-screen bg-background text-foreground")}>
        <Header />
        <main className="mx-auto max-w-2/3 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
