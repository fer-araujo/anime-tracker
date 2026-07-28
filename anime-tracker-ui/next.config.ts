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
      { protocol: "https", hostname: "assets.fanart.tv" },
      // Agrega este por si acaso (backups de Kitsu)
      {
        protocol: "https",
        hostname: "kitsu-production-media.s3.us-west-002.backblazeb2.com",
      },
    ],
  },
  headers: async () => {
    const isDev = process.env.NODE_ENV === "development";
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: isDev
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* https://*.supabase.co https://graphql.anilist.co https://api.themoviedb.org https://*.fanart.tv https://*.rapidapi.com https://*.onrender.com;"
              : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://*.supabase.co https://graphql.anilist.co https://api.themoviedb.org https://*.fanart.tv https://*.rapidapi.com https://*.onrender.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
