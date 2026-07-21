import { Suspense } from "react";
import MyAnimePage from "@/components/lists/MyAnimePage";

export const metadata = {
  title: "Mis listas — Anime Tracker",
  description: "Gestiona tu lista de animes",
};

export default function MyAnimeRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <MyAnimePage />
    </Suspense>
  );
}
