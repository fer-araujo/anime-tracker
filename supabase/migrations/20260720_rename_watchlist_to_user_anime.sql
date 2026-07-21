BEGIN;
-- Rename table
ALTER TABLE public.watchlist RENAME TO user_anime;
-- Rename enum
ALTER TYPE watchlist_status RENAME TO tracking_status;
-- Rename indexes
ALTER INDEX IF EXISTS idx_watchlist_user_status RENAME TO idx_user_anime_user_status;
ALTER INDEX IF EXISTS idx_watchlist_user_favorite RENAME TO idx_user_anime_user_favorite;
ALTER INDEX IF EXISTS idx_watchlist_user_score RENAME TO idx_user_anime_user_score;
-- Rename trigger
ALTER TRIGGER watchlist_updated_at ON public.user_anime RENAME TO user_anime_updated_at;
-- Rename constraint
ALTER TABLE public.user_anime RENAME CONSTRAINT watchlist_user_anime_unique TO user_anime_user_anime_unique;
-- Recreate RLS policies (can't rename policies)
DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.user_anime;
DROP POLICY IF EXISTS "Users can insert into their own watchlist" ON public.user_anime;
DROP POLICY IF EXISTS "Users can update their own watchlist" ON public.user_anime;
DROP POLICY IF EXISTS "Users can delete from their own watchlist" ON public.user_anime;
CREATE POLICY "Users can view their own anime" ON public.user_anime FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own anime" ON public.user_anime FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own anime" ON public.user_anime FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own anime" ON public.user_anime FOR DELETE USING (auth.uid() = user_id);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS public.user_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT user_lists_user_name_unique UNIQUE (user_id, name)
);
CREATE TABLE IF NOT EXISTS public.list_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.user_lists(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (list_id, anime_id)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_lists_user ON public.user_lists (user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_list_entries_list ON public.list_entries (list_id);
CREATE INDEX IF NOT EXISTS idx_list_entries_anime ON public.list_entries (anime_id);
-- Triggers
CREATE TRIGGER user_lists_updated_at BEFORE UPDATE ON public.user_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- RLS for user_lists
ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own lists" ON public.user_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lists" ON public.user_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lists" ON public.user_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lists" ON public.user_lists FOR DELETE USING (auth.uid() = user_id);
-- RLS for list_entries (inherits from user_lists)
ALTER TABLE public.list_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their list entries" ON public.list_entries FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_lists l WHERE l.id = list_entries.list_id AND l.user_id = auth.uid()));
CREATE POLICY "Users can insert into their list entries" ON public.list_entries FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_lists l WHERE l.id = list_entries.list_id AND l.user_id = auth.uid()));
CREATE POLICY "Users can delete from their list entries" ON public.list_entries FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_lists l WHERE l.id = list_entries.list_id AND l.user_id = auth.uid()));
COMMIT;
