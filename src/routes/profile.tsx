import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sigma, ArrowLeft, Loader2, Flame, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { deleteAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Solvai" },
      { name: "description", content: "Manage your Solvai account, view your stats, and update your password." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [solved, setSolved] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState<number | null>(null);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const callDeleteAccount = useServerFn(deleteAccount);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: solvedCount }, { count: bmCount }, { data: s }] = await Promise.all([
        supabase.from("problems").select("*", { count: "exact", head: true }),
        supabase.from("problems").select("*", { count: "exact", head: true }).eq("bookmarked", true),
        supabase.from("streaks").select("current_streak, longest_streak").maybeSingle(),
      ]);
      setSolved(solvedCount ?? 0);
      setBookmarked(bmCount ?? 0);
      setStreak({ current: s?.current_streak ?? 0, longest: s?.longest_streak ?? 0 });
    })();
  }, [user]);

  const updatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Password must be at least 6 characters");
    if (pwd !== pwd2) return toast.error("Passwords don't match");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPwd("");
    setPwd2("");
    toast.success("Password updated");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/solvai-icon.png" alt="Solvai" className="h-8 w-8 rounded-lg" />
            <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/solve" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Solve
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-10 pb-24 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

        <PremiumStatus userId={user.id} />

        <section className="mt-8 grid grid-cols-3 gap-3">
          <StatCard icon={<BookOpen className="h-4 w-4" />} label="Solved" value={solved} />
          <StatCard icon={<Flame className="h-4 w-4 text-orange-500" />} label="Current streak" value={streak?.current ?? null} suffix="d" />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Longest streak" value={streak?.longest ?? null} suffix="d" />
        </section>

        <section className="mt-8 rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">Set a new password for your account.</p>
          <form onSubmit={updatePassword} className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Update password
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign out of this device.</p>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Sign out
          </button>
        </section>

        <section className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="font-serif text-lg font-semibold text-destructive">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete your account and all your problems. This cannot be undone.
          </p>
          <button
            onClick={async () => {
              if (!confirm("Delete your account and all data? This cannot be undone.")) return;
              if (!confirm("Are you absolutely sure? Type OK in the next dialog to confirm.")) return;
              setDeleting(true);
              try {
                await callDeleteAccount({} as any);
                await signOut();
                toast.success("Account deleted");
                navigate({ to: "/" });
              } catch (e: any) {
                toast.error(e?.message || "Could not delete account");
              } finally {
                setDeleting(false);
              }
            }}
            disabled={deleting}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete account
          </button>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-serif text-2xl font-semibold">
        {value === null ? "—" : value}
        {suffix && value !== null ? <span className="ml-0.5 text-base font-normal text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}

function PremiumStatus({ userId }: { userId: string }) {
  const [subscription, setSubscription] = useState<{
    is_premium: boolean;
    premium_until: string | null;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("subscriptions")
      .select("is_premium, premium_until")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => setSubscription(data));
  }, [userId]);

  const isPremium = subscription?.is_premium &&
    subscription?.premium_until &&
    new Date(subscription.premium_until) > new Date();

  return (
    <section className="mt-8 rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold">Membership</h2>
          {isPremium ? (
            <>
              <p className="mt-1 text-sm text-primary font-medium">✦ Premium</p>
              <p className="text-xs text-muted-foreground">
                Expires {new Date(subscription!.premium_until!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Free plan · 10 problems/day</p>
          )}
        </div>
        {!isPremium && (
          <Link
            to="/upgrade"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upgrade →
          </Link>
        )}
      </div>
    </section>
  );
}