export function extractStudio(
  studios?: {
    edges?:
      | { isMain?: boolean | null; node?: { name?: string | null } | null }[]
      | null;
    nodes?: { name?: string | null }[] | null; // Agregamos soporte para la estructura ligera
  } | null,
): string | null {
  if (!studios) return null;

  // 1. Intentamos con la estructura clásica (edges)
  if (studios.edges && studios.edges.length > 0) {
    const main = studios.edges.find((e) => e?.isMain)?.node?.name;
    if (main) return main;
    return studios.edges[0]?.node?.name ?? null;
  }

  // 2. Fallback a la estructura optimizada (nodes)
  // Como en el query ya filtramos por (isMain: true), sabemos que el primero es el correcto
  if (studios.nodes && studios.nodes.length > 0) {
    return studios.nodes[0]?.name ?? null;
  }

  return null;
}
