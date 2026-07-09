export interface TitleSet {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

export function preferTitle(titles: TitleSet): string {
  return titles.english ?? titles.romaji ?? titles.native ?? "Untitled";
}
