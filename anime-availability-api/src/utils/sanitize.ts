export function htmlToText(raw?: string | null): string {
  if (!raw) return "";
  let s = String(raw);

  // 1) conservar saltos razonables y quitar etiquetas frecuentes
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\/?(i|em|b|strong|u)>/gi, "");
  s = s.replace(/<[^>]+>/g, "");

  // 2) decodificar entidades mínimas
  const map: Record<string,string> = {
    "&nbsp;":" ", "&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"', "&#39;":"'"
  };
  s = s.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (m)=>map[m]||m);

  // 3) remover “Source:” al final o entre corchetes/paréntesis
  //   (varias variantes que suelen devolver AniList/MAL/Kitsu)
  s = s
    // [Source: ...]  (al final o en medio)
    .replace(/\s*\[(?:\s*source|sources)\s*:\s*[^|\]\)]*?\]\s*$/gim, "")
    .replace(/\s*\((?:\s*source|sources)\s*:\s*[^|\]\)]*?\)\s*$/gim, "")
    // — Source: ...
    .replace(/\s*(?:—|-)\s*(?:source|sources)\s*:\s*.*$/gim, "")
    // “Source: …” suelto al final
    .replace(/\s*source\s*:\s*.*$/gim, "");

  // 4) normalización básica
  s = s.replace(/\r/g, "")
       .replace(/\n{3,}/g, "\n\n")
       .replace(/[ \t]{2,}/g, " ")
       .trim();

  return s;
}

// opcional: para hacer versiones cortas desde el API
export function shorten(text: string, max = 220): string {
  if (!text) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max).replace(/\s+[^ \n]*$/, ""); // no cortar palabra
  return cut + "…";
}
