import type { ReactNode } from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import { AuthProvider } from "@/providers/AuthProvider";
import { UserListsProvider } from "@/providers/UserListsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Anime Tracker",
    template: "%s — Anime Tracker",
  },
  description:
    "Descubre, organiza y da seguimiento a tus animes favoritos. Explora temporadas, crea colecciones y encuentra dónde ver cada serie.",
  keywords: ["anime", "tracker", "streaming", "temporada", "watchlist", "colecciones"],
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Anime Tracker",
    title: "Anime Tracker — Descubre y organiza tu anime",
    description:
      "Explora temporadas, crea colecciones y encuentra dónde ver cada serie.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anime Tracker",
    description:
      "Descubre, organiza y da seguimiento a tus animes favoritos.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>
          {/* Inside AuthProvider: the lists are scoped to the signed-in user,
              so this provider reads `user` from the one above it. */}
          <UserListsProvider>
            <Header />
            <main className="relative flex flex-col min-h-screen">
              {children}
            </main>
          </UserListsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
