import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Streak = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

export function useStreak(refreshKey?: unknown) {
  const { user } = useAuth();
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    if (!user) {
      setStreak(null);
      return;
    }
    supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setStreak(data ?? { current_streak: 0, longest_streak: 0, last_activity_date: null }));
  }, [user, refreshKey]);

  return streak;
}

