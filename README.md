# Anime Tracker

> A platform to search, discover, and track currently airing anime — showing exactly **where to stream them** (Crunchyroll, Netflix, Prime Video, HBO Max, Disney+, and more).

---

## 🧱 Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38BDF8?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Shadcn/UI-darkgray?style=flat-square" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Express.js-4.19-000000?style=flat-square&logo=express" />
  <img src="https://img.shields.io/badge/TMDB%20API-green?style=flat-square&logo=tmdb" />
  <img src="https://img.shields.io/badge/AniList%20API-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/MyAnimeList%20API-0072F9?style=flat-square" />
</p>

**Monorepo Structure**

| Project | Description | Stack |
|----------|--------------|-------|
| **anime-availability-api** | Backend service that integrates TMDB, AniList, MyAnimeList, and Kitsu APIs to fetch anime data and availability across major streaming platforms. | Express · TypeScript · TMDB API · pLimit |
| **anime-tracker-ui** | A clean and modern Next.js 15 web app focused on elegant visuals and a smooth UX. | Next.js · Tailwind CSS v4 · shadcn/ui |

---

## 🎯 Purpose

**Anime Tracker** aims to provide an easy, beautiful, and centralized way to discover **where to watch your favorite anime** — inspired by JustWatch, but **built exclusively for anime** and enriched with metadata like genres, ratings, and synopsis.

---

## ✨ Features

✅ Search any anime title (debounced + auto-filter)  
✅ TMDB integration with high-quality posters  
✅ Automatic filtering for **true anime titles only**  
✅ Detects **streaming platforms availability**  
✅ Custom **platform badges** (Netflix, Crunchyroll, etc.)  
✅ Smooth **loading skeletons** and subtle animations  
✅ Minimal, modern **dark theme UI**  
✅ Optimized backend with caching and concurrency control  

---

## ⚙️ Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/fer-araujo/anime-tracker.git
cd anime-tracker

# 2. Install dependencies
npm install

# 3. Run the backend
cd anime-availability-api
npm run dev

# 4. Run the frontend
cd ../anime-tracker-ui
npm run dev
```

## Preview (soon)


---

## License

Released under the MIT License.
Feel free to use, fork, and expand — just credit the authors 🙌.

---

✨ Built with passion for anime and clean code. 🎥
