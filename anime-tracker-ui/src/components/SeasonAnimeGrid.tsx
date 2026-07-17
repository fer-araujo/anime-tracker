"use client";

import { useState, useEffect } from "react";

/* -------------------------------------------------------------------------- */
/*  Module-level cache                                                        */
/* -------------------------------------------------------------------------- */

interface CacheEntry {
  posters: string[];
  timestamp: number;
}

let cachedData: CacheEntry | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/* -------------------------------------------------------------------------- */
/*  Grid constants — mismo layout que el original                             */
/* -------------------------------------------------------------------------- */

interface GridItem {
  x: number;
  y: number;
  opacity: number;
  imgIdx: number;
}

const GRID_ITEMS: GridItem[] = [
  { x: 0, y: 0, opacity: 0.1, imgIdx: 0 },
  { x: 0, y: 180, opacity: 0.25, imgIdx: 1 },
  { x: 0, y: 360, opacity: 0.12, imgIdx: 2 },
  { x: 0, y: 540, opacity: 0.05, imgIdx: 3 },
  { x: 130, y: -90, opacity: 0.08, imgIdx: 4 },
  { x: 130, y: 90, opacity: 0.3, imgIdx: 5 },
  { x: 130, y: 270, opacity: 0.15, imgIdx: 6 },
  { x: 130, y: 450, opacity: 0.2, imgIdx: 7 },
  { x: 130, y: 630, opacity: 0.07, imgIdx: 8 },
  { x: 260, y: 0, opacity: 0.22, imgIdx: 9 },
  { x: 260, y: 180, opacity: 0.1, imgIdx: 10 },
  { x: 260, y: 360, opacity: 0.28, imgIdx: 11 },
  { x: 260, y: 540, opacity: 0.05, imgIdx: 0 },
  { x: 390, y: -90, opacity: 0.18, imgIdx: 1 },
  { x: 390, y: 90, opacity: 0.08, imgIdx: 2 },
  { x: 390, y: 270, opacity: 0.25, imgIdx: 3 },
  { x: 390, y: 450, opacity: 0.12, imgIdx: 4 },
  { x: 390, y: 630, opacity: 0.2, imgIdx: 5 },
];

interface SeasonAnimeItem {
  images?: { poster?: string };
}

function getPosterUrl(item: unknown): string {
  return (item as SeasonAnimeItem).images?.poster ?? "";
}

/* -------------------------------------------------------------------------- */
/*  SeasonAnimeGrid — SVG pattern idéntico al original                        */
/* -------------------------------------------------------------------------- */

interface SeasonAnimeGridProps {
  posters?: string[];
}

export default function SeasonAnimeGrid({
  posters: postersProp,
}: SeasonAnimeGridProps) {
  const [posters, setPosters] = useState<string[]>(postersProp ?? []);

  useEffect(() => {
    let cancelled = false;

    // Mostrar fallback al instante si no hay caché
    if (postersProp && postersProp.length > 0 && !cachedData) {
      setPosters(postersProp);
    }

    // Cache fresca? usar esa
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      setPosters(cachedData.posters);
      return;
    }

    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const res = await fetch(`${baseUrl}/season?country=MX`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: unknown = await res.json();
        const data: unknown[] = Array.isArray(
          (json as Record<string, unknown>)?.data,
        )
          ? ((json as Record<string, unknown>).data as unknown[])
          : [];
        const urls = data.slice(0, 30).map(getPosterUrl).filter(Boolean);
        if (!cancelled && urls.length > 0) {
          cachedData = { posters: urls, timestamp: Date.now() };
          setPosters(urls);
        }
      } catch {
        if (!cancelled && posters.length === 0 && cachedData) {
          setPosters(cachedData.posters);
        }
      }
    };

    if (cachedData) {
      setPosters(cachedData.posters);
      fetchData();
    } else {
      fetchData();
    }

    return () => {
      cancelled = true;
    };
  }, [postersProp]);

  if (posters.length === 0) return null;

  const count = posters.length;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute -inset-[80%] origin-center -rotate-[15deg] opacity-70">
        <svg width="100%" height="100%">
          <defs>
            <clipPath id="sg-poster-radius">
              <rect width="110" height="160" rx="10" />
            </clipPath>
            <pattern
              id="sg-hero-grid"
              width="520"
              height="720"
              patternUnits="userSpaceOnUse"
            >
              {GRID_ITEMS.map((item, idx) => (
                <g key={idx} transform={`translate(${item.x}, ${item.y})`}>
                  <rect
                    width="110"
                    height="160"
                    rx="10"
                    fill="rgba(255,255,255,0.01)"
                  />
                  <image
                    href={posters[item.imgIdx % count]}
                    width="110"
                    height="160"
                    preserveAspectRatio="xMidYMid slice"
                    clipPath="url(#sg-poster-radius)"
                    opacity={item.opacity}
                  />
                </g>
              ))}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sg-hero-grid)" />
        </svg>
      </div>
    </div>
  );
}
