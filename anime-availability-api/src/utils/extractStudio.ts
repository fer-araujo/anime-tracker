export function extractStudio(
  studios?: {
    edges?:
      | { isMain?: boolean | null; node?: { name?: string | null } | null }[]
      | null;
  } | null
): string | null {
  const edges = studios?.edges;
  if (!edges?.length) return null;
  const main = edges.find((e) => e?.isMain)?.node?.name;
  return main ?? edges[0]?.node?.name ?? null;
}