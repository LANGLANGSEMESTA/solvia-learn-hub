DROP POLICY "Users update own problems" ON public.problems;

CREATE POLICY "Users update own problems" ON public.problems
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);