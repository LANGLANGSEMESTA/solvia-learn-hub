
CREATE TABLE public.streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own streak" ON public.streaks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own streak" ON public.streaks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own streak" ON public.streaks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() at time zone 'UTC')::date;
  prev public.streaks%ROWTYPE;
  new_current integer;
BEGIN
  SELECT * INTO prev FROM public.streaks WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (NEW.user_id, 1, 1, today);
    RETURN NEW;
  END IF;

  IF prev.last_activity_date = today THEN
    new_current := prev.current_streak;
  ELSIF prev.last_activity_date = today - 1 THEN
    new_current := prev.current_streak + 1;
  ELSE
    new_current := 1;
  END IF;

  UPDATE public.streaks
  SET current_streak = new_current,
      longest_streak = GREATEST(prev.longest_streak, new_current),
      last_activity_date = today,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bump_streak_on_problem
AFTER INSERT ON public.problems
FOR EACH ROW
EXECUTE FUNCTION public.bump_streak();
