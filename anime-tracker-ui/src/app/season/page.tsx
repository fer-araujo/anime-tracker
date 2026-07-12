import SeasonPage from "@/components/season/Season";

export default async function SeasonRoute({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; season?: string }>;
}) {
  const { year, season } = await searchParams;

  return <SeasonPage year={year} season={season} />;
}
