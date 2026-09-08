# Graph Report - anime-availability-api  (2026-09-07)

## Corpus Check
- 100 files · ~40,205 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 539 nodes · 1163 edges · 30 communities (17 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b38e2b1f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatAnimeList.ts
- tmdb.service.ts
- season.controller.ts
- resolveProviders.ts
- types.ts
- devDependencies
- app.ts
- index.ts
- mediaCardFields.test.ts
- recommendations.controller.ts
- schedule.controller.ts
- fetch.ts
- compilerOptions
- dependencies
- scripts
- package.json
- build-id-map.mjs
- express.d.ts
- cors
- dotenv
- express
- fuse.js
- helmet
- morgan
- p-limit
- sanitize-html
- @upstash/redis

## God Nodes (most connected - your core abstractions)
1. `formatAnimeList()` - 27 edges
2. `anilistFetch()` - 22 edges
3. `logger` - 20 edges
4. `fetchWithRetry()` - 16 edges
5. `resolveProvidersForAnimeDetailed()` - 16 edges
6. `searchAnimeFromAnilist()` - 13 edges
7. `HybridCache` - 13 edges
8. `setCacheControl()` - 13 edges
9. `ENV` - 12 edges
10. `getSchedule()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `formatAnimeList()` --indirect_call--> `isAnimeCandidate()`  [INFERRED]
  src/utils/formatAnimeList.ts → src/services/tmdb.service.ts
- `origin()` --calls--> `isOriginAllowed()`  [EXTRACTED]
  src/app.ts → src/utils/cors.ts
- `getAnimeDetails()` --calls--> `resolveHeroArtwork()`  [EXTRACTED]
  src/controllers/anime.controller.ts → src/utils/artwork.ts
- `getAnimeDetails()` --calls--> `setCacheControl()`  [EXTRACTED]
  src/controllers/anime.controller.ts → src/utils/cache.ts
- `getAnimeRating()` --calls--> `createSupabaseAdmin()`  [EXTRACTED]
  src/controllers/anime.controller.ts → src/utils/supabase.ts

## Import Cycles
- None detected.

## Communities (30 total, 10 thin omitted)

### Community 0 - "formatAnimeList.ts"
Cohesion: 0.07
Nodes (48): getAnimeBatch(), getAnimeDetails(), getAnimeRating(), mapStatus(), searchTitle(), ANIME_DETAILS_GQL, SearchQuery, artworkFromBanner() (+40 more)

### Community 1 - "tmdb.service.ts"
Cohesion: 0.07
Nodes (50): getAnimeProviders(), router, allUrls(), FanartArtwork, FanartTvImage, FanartTvResponse, _fetchFanartTvArtwork(), filterEnglishOrNoLang() (+42 more)

### Community 2 - "season.controller.ts"
Cohesion: 0.07
Nodes (42): getHomeHero(), HeroPayload, stripHtml(), fetchAllPages(), ARCHIVE_SEASONS, ArchivePage, fetchLeftovers(), getSeason() (+34 more)

### Community 3 - "resolveProviders.ts"
Cohesion: 0.07
Nodes (36): ENV, required, PORT, server, tmdbWatchProvidersDetailed(), cacheStore, mockGetStored, mockStore (+28 more)

### Community 4 - "types.ts"
Cohesion: 0.07
Nodes (33): fetchAniListBySearch(), normalizeStatus(), kitsuSearchAnime(), normalizeStatus(), malSearchAnime(), normalizeStatus(), AiringStatus, AniCover (+25 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (35): eslint, eslint-config-prettier, nodemon, devDependencies, eslint, eslint-config-prettier, nodemon, prettier (+27 more)

### Community 6 - "app.ts"
Cohesion: 0.11
Nodes (17): allowedOrigins, apiRateLimit, app, origin(), AppError, ExternalAPIError, NotFoundError, ValidationError (+9 more)

### Community 7 - "index.ts"
Cohesion: 0.12
Nodes (16): fetchImages(), getArtwork(), validate(), searchQuerySchema, SeasonQuery, seasonQuerySchema, router, router (+8 more)

### Community 8 - "mediaCardFields.test.ts"
Cohesion: 0.14
Nodes (15): MEDIA_CARD_FIELDS, ANIME_BATCH_GQL, HOME_HERO_GQL, SEED_RECOMMENDATIONS_GQL, AIRING_SCHEDULE_GQL, UPCOMING_MEDIA_GQL, REAL_LIST_IDS, CARD_QUERIES (+7 more)

### Community 9 - "recommendations.controller.ts"
Cohesion: 0.21
Nodes (16): cacheKey(), getRecommendations(), RecommendationsBody, SeedRecommendationsResponse, CandidateFacts, RawRecommendation, ScoredCandidate, Seed (+8 more)

### Community 10 - "schedule.controller.ts"
Cohesion: 0.22
Nodes (18): AiringEntry, AiringSchedule, byRatingThenTitle(), DayGroup, formatSchedules(), FormattedAnime, getSchedule(), groupByDay() (+10 more)

### Community 11 - "fetch.ts"
Cohesion: 0.14
Nodes (7): backoff(), BreakerState, CircuitBreaker, CircuitBreakerOpenError, CircuitBreakerOptions, FetchWithRetryOptions, RollingWindow

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (15): src, src/__tests__, compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution (+7 more)

### Community 13 - "dependencies"
Cohesion: 0.15
Nodes (13): axios, compression, express-rate-limit, dependencies, axios, compression, express-rate-limit, pino (+5 more)

### Community 14 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, format, format:check, lint, lint:fix, start (+2 more)

### Community 15 - "package.json"
Cohesion: 0.22
Nodes (8): author, description, keywords, license, main, name, type, version

### Community 16 - "build-id-map.mjs"
Cohesion: 0.50
Nodes (3): here, map, out

## Knowledge Gaps
- **156 isolated node(s):** `name`, `version`, `main`, `dev`, `build` (+151 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `resolveProviders.ts` to `formatAnimeList.ts`, `tmdb.service.ts`, `season.controller.ts`, `types.ts`, `app.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `anilistFetch()` connect `season.controller.ts` to `formatAnimeList.ts`, `tmdb.service.ts`, `types.ts`, `recommendations.controller.ts`, `schedule.controller.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `HybridCache` connect `season.controller.ts` to `formatAnimeList.ts`, `tmdb.service.ts`, `types.ts`, `recommendations.controller.ts`, `schedule.controller.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `version`, `main` to the rest of the system?**
  _156 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatAnimeList.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07281772953414745 - nodes in this community are weakly interconnected._
- **Should `tmdb.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06758832565284179 - nodes in this community are weakly interconnected._
- **Should `season.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06516290726817042 - nodes in this community are weakly interconnected._