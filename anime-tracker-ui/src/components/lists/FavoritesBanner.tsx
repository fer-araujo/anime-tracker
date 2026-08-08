"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";
import { resolveRailWidth } from "@/lib/lists";
import Icon from "@/components/custom/Icon";

/**
 * Every state renders the same box. Loading used to be `lg:h-56` while the
 * empty state stopped at `sm:h-48`, so the page reflowed the instant the fetch
 * resolved — a layout shift the user could see. One shared shell, no jump.
 *
 * The radius matches the list cards (`rounded-[14px]`); the banner sits right
 * above them and a softer `rounded-3xl` read as a different family of surface.
 *
 * The height came down one step (was `h-40 sm:h-48 lg:h-56`). Now that the rail
 * spans up to two thirds of the width, the old height left a tall column of
 * empty background above the title — the copy floated instead of sitting on a
 * base. A shorter, wider box reads as one banner.
 */
const BANNER_SHELL =
  "relative w-full h-36 sm:h-44 lg:h-52 rounded-[14px] overflow-hidden border border-white/10";

/** How many favorites the rail previews. Drives the batch slice below too. */
const RAIL_SIZE = 5;

export function FavoritesBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [count, setCount] = useState(0);
  const [posters, setPosters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("user_anime")
      .select("anime_id")
      .eq("user_id", user.id)
      .eq("favorite", true)
      .then(async ({ data: favs }) => {
        const entries = favs ?? [];
        setCount(entries.length);

        if (entries.length > 0) {
          try {
            const ids = entries.slice(0, RAIL_SIZE).map((e) => e.anime_id);
            const batchData = await fetchAnimeBatch(ids);
            // The batch response already carries every poster; the old code
            // read a single backdrop and dropped the rest. Keeping them costs
            // zero extra requests.
            const found = ids
              .map((id) => batchData.get(id)?.poster ?? null)
              .filter((poster): poster is string => poster !== null);
            setPosters(found);
          } catch {
            // Poster fetch fails silently — the scrim alone still reads fine.
          }
        }
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div
        className={`${BANNER_SHELL} bg-white/[0.03] animate-pulse motion-reduce:animate-none`}
      />
    );
  }

  if (count === 0) {
    return (
      <div
        className={`${BANNER_SHELL} bg-white/[0.02] flex flex-col items-center justify-center gap-3`}
      >
        {/* A pink wash keeps the empty state inside the favorites identity;
            the previous flat panel was indistinguishable from a dead card. */}
        <div className="absolute inset-0 bg-radial-[at_50%_115%] from-pink-500/20 to-transparent to-70%" />
        <p className="relative z-[1] text-white/40 text-sm">
          Añade animes a favoritos para verlos aquí
        </p>
        <button
          type="button"
          onClick={() => router.push("/season")}
          className="relative z-[1] px-4 py-1.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-sm font-medium transition-colors [@media(hover:hover)]:hover:bg-pink-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          Explorar temporada
        </button>
      </div>
    );
  }

  return (
    <motion.div
      // The banner has always behaved like a link but was a bare div: no role,
      // no tab stop, no keyboard activation. Screen reader and keyboard users
      // could not reach the favorites list from here at all.
      role="button"
      tabIndex={0}
      aria-label={`Favoritos, ${count} ${count === 1 ? "serie guardada" : "series guardadas"}`}
      className={`${BANNER_SHELL} group cursor-pointer transition-colors [@media(hover:hover)]:hover:border-pink-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400`}
      whileHover="hover"
      onClick={() => router.push("/lists/favorites")}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          // Space scrolls the page by default, which would yank the banner out
          // of view at the exact moment it activates.
          event.preventDefault();
          router.push("/lists/favorites");
        }
      }}
    >
      {/* Rail of complete covers, adjacent and bleeding off the right edge.
          The wrapper takes a PERCENTAGE of the banner, so the rail scales with
          the container instead of the old fixed rem-per-poster width that left
          ~60% of a 1280px banner as an empty black field.

          The mask is what kills the hard vertical seam where the rail used to
          start: the artwork dissolves into the background over its first 18%
          rather than being cut by an edge. `overflow-hidden` keeps the hover
          zoom inside the masked box — a gradient mask defaults to `repeat`, so
          content spilling past the box would pick up a second fade. */}
      {/* If the poster request failed the user still has favorites, so the
          banner keeps a pink wash rather than collapsing to a bare panel that
          looks like the empty state — the count below already says otherwise. */}
      {posters.length === 0 && (
        <div className="absolute inset-0 z-0 bg-radial-[circle_at_78%_50%] from-pink-500/18 to-transparent" />
      )}

      <div
        className="absolute inset-y-0 right-0 z-[1] overflow-hidden"
        style={{
          width: resolveRailWidth(posters.length),
          maskImage: "linear-gradient(to right, transparent, black 18%)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 18%)",
        }}
      >
        <motion.div
          className="grid h-full w-full grid-flow-col gap-[2px]"
          // Even columns: the rail already owns a known share of the width, so
          // the posters divide it instead of each claiming a fixed size.
          style={{ gridAutoColumns: "minmax(0, 1fr)" }}
          // 8s meant the zoom never finished before the pointer left, so the
          // interaction read as broken. 400ms lands inside a normal hover.
          variants={prefersReducedMotion ? undefined : { hover: { scale: 1.04 } }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {posters.map((poster, index) => (
            <div key={`${poster}-${index}`} className="relative h-full">
              <Image
                src={poster}
                alt=""
                fill
                // Columns are now a share of the viewport, not a fixed 120px;
                // the old hint made Next serve an image too small to stay sharp.
                sizes="20vw"
                className="object-cover"
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scrim: opaque under the title so it keeps AA contrast over any cover,
          then off entirely by the middle. With the rail this wide the old
          `via-background/75` sat on top of most of the artwork and flattened it
          into grey; the fade now ends where the title's text box ends. */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-background from-22% via-background/55 via-45% to-transparent to-70%" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      <div className="absolute inset-0 z-[3] p-6 md:p-8 flex flex-col justify-end">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-pink-500/20 border border-pink-500/30 backdrop-blur-md text-pink-400">
            <Icon name="Heart" size={18} className="fill-pink-400" />
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg">
            Favoritos
          </h2>
        </div>
        <p className="text-white/70 font-medium text-sm mt-2">
          {count} {count === 1 ? "serie guardada" : "series guardadas"}
        </p>
      </div>
    </motion.div>
  );
}
