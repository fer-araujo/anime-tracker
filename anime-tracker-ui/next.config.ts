/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "media.kitsu.io",
        pathname: "/anime/poster_images/**",
      },
      {
        protocol: "https",
        hostname: "media.kitsu.app",
        pathname: "/anime/**",
      },
      {
        protocol: "https",
        hostname: "kitsu-production-media.s3.us-west-002.backblazeb2.com",
        pathname: "/anime/**",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
        pathname: "/file/anilistcdn/media/anime/**",
      },
    ],
  },
};

export default nextConfig;
