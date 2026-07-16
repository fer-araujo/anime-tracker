import type { ReactNode } from "react";
import Header from "@/components/Header";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "Anime Tracker",
  description: "Temporada y plataformas de streaming",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>
          <Header />
          <main className="relative flex flex-col min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
