import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyStreak({ userId }: { userId: string }) {
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const [{ data: problems }, { data: streakData }] = await Promise.all([
        supabase
          .from("problems")
          .select("created_at")
          .eq("user_id", userId)
          .gte("created_at", monday.toISOString()),
        supabase
          .from("streaks")
          .select("current_streak")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (problems) {
        const days = new Set(
          problems.map((p) => {
            const d = new Date(p.created_at);
            return (d.getDay() + 6) % 7; // convert to Mon=0
          })
        );
        setActiveDays(days);
      }

      if (streakData) setStreak(streakData.current_streak ?? 0);
      setLoading(false);
    }

    fetchData();
  }, [userId]);

  if (loading) return null;

  const today = (new Date().getDay() + 6) % 7;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="font-semibold text-sm">{streak} day streak</span>
        </div>
        <span className="text-xs text-muted-foreground">This week</span>
      </div>
      <div className="flex justify-between gap-1">
        {DAYS.map((day, i) => {
          const isActive = activeDays.has(i);
          const isToday = i === today;
          return (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : isToday
                  ? "border-2 border-primary/50 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                {isActive ? (
                  <span className="text-sm font-bold">✓</span>
                ) : (
                  <span className="text-xs">{day[0]}</span>
                )}
              </div>
              <span className={cn(
                "text-[10px]",
                isToday ? "text-primary font-semibold" : "text-muted-foreground"
              )}>{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}