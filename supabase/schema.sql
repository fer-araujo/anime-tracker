-- =============================================================================
-- Supabase schema — anime-tracker
--
-- API keys (Settings → API):
--   Project URL       → NEXT_PUBLIC_SUPABASE_URL
--   Publishable key   → NEXT_PUBLIC_SUPABASE_ANON_KEY
--   Secret key        → SUPABASE_SECRET_KEY (server only, NEVER exposed)     -- =============================================================================

-- =============================================================================
-- 1. PROFILES
--    Extends auth.users with app-specific data
--    Trigger auto-creates a profile when a new user signs up
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  country    TEXT DEFAULT 'MX',          -- ISO country code for provider filtering
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.email
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 2. WATCHLIST
--    Tracks every anime a user interacts with
--    5 statuses: plan_to_watch | watching | completed | on_hold | dropped
--    Score is nullable — only set when user rates (completed status)
--    Unique constraint: one row per user + anime
-- =============================================================================

CREATE TYPE watchlist_status AS ENUM (
  'plan_to_watch',
  'watching',
  'completed',
  'on_hold',
  'dropped'
);

CREATE TABLE IF NOT EXISTS public.watchlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anime_id   INTEGER NOT NULL,             -- AniList ID
  status     watchlist_status NOT NULL DEFAULT 'plan_to_watch',
  favorite   BOOLEAN NOT NULL DEFAULT FALSE,
  score      SMALLINT CHECK (score >= 1 AND score <= 10),  -- only when completed
  progress   INTEGER DEFAULT 0,            -- episodes watched (optional)
  notes      TEXT,                         -- personal notes (optional)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One row per user+anime
  CONSTRAINT watchlist_user_anime_unique UNIQUE (user_id, anime_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user_status
  ON public.watchlist (user_id, status);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_favorite
  ON public.watchlist (user_id, favorite)
  WHERE favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_watchlist_user_score
  ON public.watchlist (user_id, score)
  WHERE score IS NOT NULL;

-- Updated-at trigger
CREATE TRIGGER watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
--    Each user can only see and edit their own data
-- =============================================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Watchlist
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON public.watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist"
  ON public.watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist"
  ON public.watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist"
  ON public.watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 4. FUTURE TABLES (Phase 2a — Notifications)
--    Uncomment when implementing notifications
-- =============================================================================

/*
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anime_id    INTEGER NOT NULL,
  episode     INTEGER NOT NULL,
  title       TEXT NOT NULL,               -- Anime title at time of notification
  airing_at   TIMESTAMPTZ NOT NULL,
  sent        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_unsent
  ON public.notification_queue (sent, airing_at)
  WHERE sent = FALSE;
*/

-- =============================================================================
-- 5. VERIFICATION QUERIES
--    Run these after setting up to confirm everything works
-- =============================================================================

-- Check enum values:
-- SELECT unnest(enum_range(NULL::watchlist_status));

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';
