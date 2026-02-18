import AnimeDetailsPage from "@/components/AnimeDetails";
import { fetchAnimeDetails } from "@/lib/api";

// Componente de Servidor (Server Component)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>; // ⚠️ En Next 15, params es una Promesa
}) {
  // 1. Esperamos a que se resuelvan los parámetros
  const { id } = await params;
  
  // 2. Pedimos los datos al backend
  // Si falla, Next.js mostrará automáticamente su página de error o 404
  const response = await fetchAnimeDetails(id);

  // 3. Renderizamos el componente cliente (UI) pasándole los datos
  return <AnimeDetailsPage anime={response.data} />;
}