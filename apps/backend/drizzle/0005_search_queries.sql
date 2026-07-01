-- 0005_search_queries.sql
-- Search-Domain: Suchanfragen-Analytics

CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  domain_filter text,
  result_count integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_queries_user_idx ON public.search_queries(user_id, created_at DESC);
