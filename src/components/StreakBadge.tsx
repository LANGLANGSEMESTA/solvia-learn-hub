import { Flame } from "lucide-react";
import { useStreak } from "@/hooks/use-streak";
import { cn } from "@/lib/utils";

export function StreakBadge({ refreshKey, className }: { refreshKey?: unknown; className?: string }) {
  const streak = useStreak(refreshKey);
  if (!streak) return null;
  const n = streak.current_streak;
  const active = n > 0;
  return (
    <div
      title={`Longest streak: ${streak.longest_streak} days`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-orange-300/50 bg-orange-500/10 text-orange-600 dark:text-orange-400"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Flame className={cn("h-3.5 w-3.5", active && "fill-current")} />
      <span>{n} day{n === 1 ? "" : "s"}</span>
    </div>
  );
}

