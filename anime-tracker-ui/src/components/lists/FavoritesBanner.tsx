"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";
import Icon from "@/components/custom/Icon";

export function FavoritesBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
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
          // Fetch the first favorite's backdrop
          try {
            const ids = entries.slice(0, 5).map((e) => e.anime_id);
            const batchData = await fetchAnimeBatch(ids);
            // Find first anime with a backdrop
            for (const id of ids) {
              const backdrop = batchData.get(id)?.backdrop ?? null;
              if (backdrop) {
                setBackdropUrl(backdrop);
                break;
              }
            }
          } catch {
            // Backdrop fetch fails silently — use gradient
          }
        }
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="relative w-full h-40 sm:h-48 lg:h-56 rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] animate-pulse" />
    );
  }

  if (count === 0) {
    return (
      <div className="relative w-full h-40 sm:h-48 rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] flex items-center justify-center">
        <p className="text-white/40 text-sm">
          Añade animes a favoritos para verlos aquí
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="relative w-full h-40 sm:h-48 lg:h-56 rounded-3xl overflow-hidden cursor-pointer group border border-white/10"
      whileHover="hover"
      onClick={() => router.push("/lists/favorites")}
    >
      {/* Dynamic backdrop or gradient fallback */}
      {backdropUrl ? (
        <motion.div
          className="absolute inset-0"
          variants={{ hover: { scale: 1.05 } }}
          transition={{ duration: 8, ease: "easeOut" }}
        >
          <Image
            src={backdropUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-60"
          />
        </motion.div>
      ) : (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-background to-purple-900/20"
          variants={{ hover: { scale: 1.05 } }}
          transition={{ duration: 8, ease: "easeOut" }}
        />
      )}

      {/* Overlay gradients for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/30 backdrop-blur-md text-pink-400">
            <Icon name="Heart" size={20} className="fill-pink-400" />
          </div>
        </div>
        <h2 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg">
          Favoritos
        </h2>
        <p className="text-white/70 font-medium text-sm mt-1">
          {count} {count === 1 ? "serie guardada" : "series guardadas"}
        </p>
      </div>
    </motion.div>
  );
}
