import type { Metadata } from "next";
import { RecommendationsPage } from "@/components/recommendations/RecommendationsPage";

export const metadata: Metadata = {
  title: "Recomendaciones",
  description:
    "Anime elegido a partir de tus favoritos y de las series que mejor has puntuado.",
};

export default function RecommendationsRoute() {
  return <RecommendationsPage />;
}
