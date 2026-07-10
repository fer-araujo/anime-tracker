import SeasonPageClient from "./SeasonPageClient";

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; season?: string }>;
}) {
  const { year, season } = await searchParams;

  return <SeasonPageClient year={year} season={season} />;
}
