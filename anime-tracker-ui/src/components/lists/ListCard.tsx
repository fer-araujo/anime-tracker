"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Icon from "@/components/custom/Icon";
import type { UserList } from "@/hooks/useUserLists";

const GLOW_MAP = [
  "from-blue-500/10 to-blue-500/30",
  "from-purple-500/10 to-purple-500/30",
  "from-emerald-500/10 to-emerald-500/30",
  "from-amber-500/10 to-amber-500/30",
  "from-pink-500/10 to-pink-500/30",
  "from-cyan-500/10 to-cyan-500/30",
] as const;

const GLOW_ORB_MAP = [
  "bg-blue-500/10 group-hover:bg-blue-500/30",
  "bg-purple-500/10 group-hover:bg-purple-500/30",
  "bg-emerald-500/10 group-hover:bg-emerald-500/30",
  "bg-amber-500/10 group-hover:bg-amber-500/30",
  "bg-pink-500/10 group-hover:bg-pink-500/30",
  "bg-cyan-500/10 group-hover:bg-cyan-500/30",
] as const;

function colorIndex(name: string) {
  return name.length % GLOW_MAP.length;
}

export function ListCard({
  list,
  onDelete,
}: {
  list: UserList;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const idx = colorIndex(list.name);

  return (
    <motion.div
      className="group relative flex flex-col justify-end w-full aspect-[4/3] p-5 rounded-2xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-colors duration-300"
      whileHover="hover"
      onClick={() => router.push(`/lists/${list.id}`)}
    >
      {/* Glow orb */}
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 blur-[50px] rounded-full transition-all duration-500 ${GLOW_ORB_MAP[idx]}`}
      />

      {/* Stacked poster fan */}
      {list.poster_anime_ids.length > 0 && (
        <div className="absolute top-5 right-5 w-20 h-28">
          {list.poster_anime_ids
            .slice(0, 3)
            .reverse()
            .map((_, i, arr) => {
              const pos = arr.length - 1 - i;
              const baseRotate = pos * 5;
              const baseOpacity = 0.3 + pos * 0.2;
              const posterUrl = list.poster_urls?.[arr.length - 1 - i] ?? null;
              return (
                <motion.div
                  key={i}
                  className="absolute inset-0 w-full h-full rounded-lg border border-white/5 overflow-hidden"
                  variants={{
                    hover: {
                      x: pos * 25 + 5,
                      y: -(pos * 8),
                      rotate: pos * 10 + 5,
                      opacity: 0.4 + pos * 0.3,
                    },
                  }}
                  style={{
                    zIndex: arr.length - i,
                    opacity: baseOpacity,
                    rotate: `${baseRotate}deg`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10" />
                  )}
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Empty state — no posters */}
      {list.poster_anime_ids.length === 0 && (
        <div className="absolute top-5 right-5 w-20 h-28 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
          <span className="text-white/15 text-xl">?</span>
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(list.id);
        }}
        className="absolute top-3 right-3 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-black/40 hover:bg-red-500/80 text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label={`Eliminar ${list.name}`}
      >
        <Icon name="X" size={12} />
      </button>

      {/* Info */}
      <div className="relative z-10 w-[60%]">
        <h3 className="text-lg font-bold text-white drop-shadow-md truncate">
          {list.name}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-black/40 text-white/70 border border-white/10 backdrop-blur-md mt-1.5">
          <Icon name="List" size={12} className="mr-1" />
          {list.anime_count}{" "}
          {list.anime_count === 1 ? "anime" : "animes"}
        </span>
      </div>
    </motion.div>
  );
}
