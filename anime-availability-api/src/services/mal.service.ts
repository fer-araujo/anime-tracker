import axios from "axios";

const MAL = "https://api.myanimelist.net/v2";

export type MalAnimeNode = {
  id: number;
  title: string;
  main_picture?: { medium?: string; large?: string };
  mean?: number | null;     // rating promedio
  media_type?: string | null;
  status?: string | null;
  start_date?: string | null;
  num_episodes?: number | null;
  genres?: { id: number; name: string }[];
};

export async function malSearchAnime(
  title: string,
  opts?: { limit?: number; fields?: string }
): Promise<MalAnimeNode | null> {
  if (!process.env.MAL_CLIENT_ID) return null; // si no hay credencial, salimos silencioso
  const limit = opts?.limit ?? 1;
  const fields =
    opts?.fields ??
    "id,title,main_picture,mean,media_type,status,start_date,num_episodes,genres";

  const { data } = await axios.get(`${MAL}/anime`, {
    params: { q: title, limit, fields },
    headers: { "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID }
  });

  const first = data?.data?.[0]?.node;
  if (!first) return null;
  return first as MalAnimeNode;
}

export async function malGetAnimeById(
  id: number,
  fields = "id,title,main_picture,mean,media_type,status,start_date,num_episodes,genres"
): Promise<MalAnimeNode | null> {
  if (!process.env.MAL_CLIENT_ID) return null;
  const { data } = await axios.get(`${MAL}/anime/${id}`, {
    params: { fields },
    headers: { "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID }
  });
  return (data as any) ?? null;
}
