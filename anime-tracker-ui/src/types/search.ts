export interface SearchResult {
  data?: {
    ids: {
      tmdb: number;
      anilist?: number;
    };
    title: string;
    poster: string;
    providers: string[];
  };
  meta: {
    query: string;
  };
}

export type SearchItem = {
  ids: { tmdb: number | null; mal?: number | null; kitsu?: string | null };
  title: string;
  subtitle?: string;
  poster: string | null;
  providers: string[];
  meta?: {
    genres?: string[];
    rating?: number | null;
    synopsis?: string | null;
    episodes?: number | null;
    startDate?: string | null;
  };
};
export interface ISearchProps {
  onResults?: (items: SearchItem[]) => void;
  onLoading?: (loading: boolean) => void;
}
export type SearchListResponse = {
  meta: { country: string; query: string; total: number; source: string };
  data: SearchItem[];
};

export interface ISearchOverlayProps {
  open: boolean;
  loading?: boolean;
  items: SearchItem[];
  onClose: () => void;
  onSelect: (it: SearchItem) => void;
  className?: string;
}
