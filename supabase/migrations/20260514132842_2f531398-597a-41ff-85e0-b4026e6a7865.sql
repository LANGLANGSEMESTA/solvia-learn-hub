CREATE TABLE public.problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  mode TEXT NOT NULL,
  input_type TEXT NOT NULL,
  input_text TEXT,
  result JSONB NOT NULL,
  bookmarked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_problems_user_created ON public.problems(user_id, created_at DESC);
CREATE INDEX idx_problems_bookmarked ON public.problems(user_id, bookmarked) WHERE bookmarked = true;

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own problems" ON public.problems
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own problems" ON public.problems
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own problems" ON public.problems
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own problems" ON public.problems
  FOR DELETE TO authenticated USING (auth.uid() = user_id);