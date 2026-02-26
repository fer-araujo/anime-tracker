# Anime Tracker 🎬

> A platform to search, discover, and track currently airing anime — showing exactly **where to stream them** (Crunchyroll, Netflix, Prime Video, HBO Max, Disney+, and more).

---

## 🧱 Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38BDF8?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Framer%20Motion-black?style=flat-square&logo=framer" />
  <img src="https://img.shields.io/badge/Radix%20UI-161618?style=flat-square&logo=radixui" />
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
| **anime-tracker-ui** | A clean, highly optimized Next.js 15 web app focused on elegant visuals, smooth UX, and strict accessibility. | Next.js · Tailwind CSS v4 · Framer Motion · Radix UI |

---

## 🎯 Purpose

**Anime Tracker** aims to provide an easy, beautiful, and centralized way to discover **where to watch your favorite anime** — inspired by JustWatch, but **built exclusively for anime** and enriched with metadata like genres, ratings, and synopsis.

---

## ✨ Features

✅ **Cinematic Discovery:** High-quality posters, dynamic background overlays, and smooth Framer Motion page transitions.
✅ **Advanced Search System:** Debounced queries with a floating UI (React Portals) to escape layout boundaries seamlessly.
✅ **Streaming Availability:** Instantly detects which platform has the anime (Netflix, Crunchyroll, etc.) with custom badges.
✅ **Zero-Bloat UI Architecture:** Built with custom, lightweight Tailwind components instead of heavy UI libraries for maximum performance.
✅ **Mobile-First & Touch Ready:** Highly responsive layout with native swipe gestures for carousels and dynamic segmented controls.
✅ **100% Accessible (a11y):** Full keyboard navigation support, screen-reader optimized elements, ARIA roles, and Focus Traps for modals.
✅ **Optimized Backend:** Concurrency control and caching for lightning-fast API aggregation.

---

## ⚙️ Local Setup

```bash
# 1. Clone the repository
git clone [https://github.com/fer-araujo/anime-tracker.git](https://github.com/fer-araujo/anime-tracker.git)
cd anime-tracker

# 2. Install dependencies (Run this in both frontend and backend folders)
npm install

# 3. Environment Variables
# Create a .env file in both the backend and frontend directories using their respective .env.example files as a guide.
# Note: You will need valid API Keys (like TMDB) for the data to load.

# 4. Run the backend
cd anime-availability-api
npm run dev

# 5. Run the frontend (in a new terminal)
cd anime-tracker-ui
npm run dev
```

## 📸 Preview
<img width="1900" height="960" alt="image" src="https://github.com/user-attachments/assets/93ec40cc-e304-4ccb-96b1-530eff5cbdad" />

<img width="1899" height="551" alt="image" src="https://github.com/user-attachments/assets/e9acc4b0-1f0a-41d1-ab7f-6c99b53e0af4" />

<img width="1901" height="951" alt="image" src="https://github.com/user-attachments/assets/f35c1a6b-c8c9-4079-afdc-23fc06ef1878" />

<img width="1887" height="956" alt="image" src="https://github.com/user-attachments/assets/3d942fbf-bcd3-44eb-9540-5ddfdc9e45d1" />

## 📜 License
Released under the MIT License.
Feel free to use, fork, and expand — just credit the authors 🙌.

## ✨ Built with passion for anime and clean code. 🎥

***
