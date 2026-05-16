ALTER TABLE public.problems ADD COLUMN share_token text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_problems_share_token ON public.problems(share_token) WHERE share_token IS NOT NULL;