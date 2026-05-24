import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sigma, Bookmark, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/use-auth";
import { StreakBadge } from "@/components/StreakBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Your problems — Solvai" },
      { name: "description", content: "Browse your saved problems and bookmarks on Solvai." },
    ],
  }),
  component: HistoryPage,
});

type Problem = {
  id: string;
  subject: string;
  mode: string;
  input_type: string;
  input_text: string | null;
  result: any;
  bookmarked: boolean;
  created_at: string;
};

type Filter = "all" | "bookmarked";

function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("problems")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter === "bookmarked") q = q.eq("bookmarked", true);
    q.then(({ data, error }) => {
      if (error) toast.error(error.message);
      else setItems((data ?? []) as Problem[]);
      setLoading(false);
    });
  }, [user, filter]);

  async function toggleBookmark(p: Problem) {
    const next = !p.bookmarked;
    const { error } = await supabase.from("problems").update({ bookmarked: next }).eq("id", p.id);
    if (error) {
      toast.error("Could not update bookmark");
      return;
    }
    setItems((items) =>
      items
        .map((it) => (it.id === p.id ? { ...it, bookmarked: next } : it))
        .filter((it) => (filter === "bookmarked" ? it.bookmarked : true)),
    );
  }

  async function deleteProblem(id: string) {
    if (!confirm("Delete this problem?")) return;
    const { error } = await supabase.from("problems").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete");
      return;
    }
    setItems((items) => items.filter((it) => it.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`}</style>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sigma className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && <StreakBadge />}
            <Link to="/solve" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">
              Solve
            </Link>
            {user && (
              <Link to="/profile" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">
                Profile
              </Link>
            )}
            {user && (
              <button onClick={() => signOut()} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Your problems</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "bookmarked" ? "Saved bookmarks" : "Recent problems you've solved"}
            </p>
          </div>
          <Link to="/solve" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New problem
          </Link>
        </div>

        <div className="mt-5 inline-flex rounded-lg border border-border bg-card p-1">
          {(["all", "bookmarked"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : "Bookmarked"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
  <div className="rounded-2xl border border-dashed border-border p-12 text-center">
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
      <span className="text-3xl">{filter === "bookmarked" ? "🔖" : "🧮"}</span>
    </div>
    <h3 className="font-serif text-lg font-semibold">
      {filter === "bookmarked" ? "No bookmarks yet" : "No problems yet"}
    </h3>
    <p className="mt-1 text-sm text-muted-foreground">
      {filter === "bookmarked" ? "Bookmark problems you want to revisit later." : "Start solving your first STEM problem!"}
    </p>
    <Link to="/solve" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
      {filter === "bookmarked" ? "Browse problems" : "Solve a problem →"}
    </Link>
  </div>
          ) : (
            items.map((p, i) => (
  <div key={p.id} 
    className="rounded-xl border border-border bg-card p-4 transition-all"
    style={{ animationDelay: `${i * 50}ms`, animation: "fadeIn 0.3s ease forwards", opacity: 0 }}
  >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">{p.subject}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground capitalize">{p.mode}</span>
                      <span>{new Date(p.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground">
                      {p.input_text || `[${p.input_type} input]`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleBookmark(p)}
                      title={p.bookmarked ? "Remove bookmark" : "Bookmark"}
                      className={cn(
                        "rounded-md p-2 transition hover:bg-muted",
                        p.bookmarked && "text-primary",
                      )}
                    >
                      <Bookmark className={cn("h-4 w-4", p.bookmarked && "fill-current")} />
                    </button>
                    <button
                      onClick={() => deleteProblem(p.id)}
                      title="Delete"
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setOpenId(openId === p.id ? null : p.id)}
                  className="mt-3 text-xs font-medium text-primary hover:underline"
                >
                  {openId === p.id ? "Hide answer" : "Show answer"}
                </button>

                {openId === p.id && (
                  <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-foreground">
                    {JSON.stringify(p.result, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-8">
          <Link to="/solve" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to solve
          </Link>
        </div>
      </main>
    </div>
  );
}

