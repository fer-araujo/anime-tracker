import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [25, 50, 75, 95],
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "media.kitsu.io" },
      { protocol: "https", hostname: "media.kitsu.app" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "shikimori.one" },
      { protocol: "https", hostname: "img1.ak.crunchyroll.com" },
      // Agrega este por si acaso (backups de Kitsu)
      { protocol: "https", hostname: "kitsu-production-media.s3.us-west-002.backblazeb2.com" }, 
    ],
  },
};

export default nextConfig;