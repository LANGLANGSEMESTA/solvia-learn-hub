import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sigma, Users, Crown, BarChart2, Search, Check, X, Loader2 } from "lucide-react";
import { getUsers, updateUserPremium } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ADMIN_EMAILS = ["irsanwu@gmail.com", "irsanwuu@gmail.com"];

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Solvai" }],
  }),
  component: AdminPage,
});

type User = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in: string;
  is_premium: boolean;
  premium_until: string | null;
  problem_count: number;
};

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [months, setMonths] = useState(1);

  const callGetUsers = useServerFn(getUsers);
  const callUpdatePremium = useServerFn(updateUserPremium);

  useEffect(() => {
    if (!loading && (!user || !ADMIN_EMAILS.includes(user.email || ""))) {
      navigate({ to: "/" });
    }
  }, [loading, user]);

  useEffect(() => {
    if (user && ADMIN_EMAILS.includes(user.email || "")) {
      callGetUsers({ data: undefined })
        .then(setUsers)
        .catch(console.error)
        .finally(() => setFetching(false));
    }
  }, [user]);

  async function handleTogglePremium(userId: string, currentStatus: boolean) {
    setUpdating(userId);
    try {
      await callUpdatePremium({
        data: {
          userId,
          isPremium: !currentStatus,
          months,
        },
      });
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? {
              ...u,
              is_premium: !currentStatus,
              premium_until: !currentStatus
                ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString()
                : null,
            }
          : u
      ));
      toast.success(!currentStatus ? `Premium activated for ${months} month(s)` : "Premium deactivated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.is_premium).length;
  const totalProblems = users.reduce((a, u) => a + u.problem_count, 0);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sigma className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-xl font-semibold">Solvai</span>
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
          </Link>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" /> Total Users
            </div>
            <div className="font-serif text-3xl font-bold">{totalUsers}</div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-primary text-sm mb-1">
              <Crown className="h-4 w-4" /> Premium Users
            </div>
            <div className="font-serif text-3xl font-bold text-primary">{premiumUsers}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart2 className="h-4 w-4" /> Total Problems Solved
            </div>
            <div className="font-serif text-3xl font-bold">{totalProblems}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Months:</label>
            <select
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
            >
              {[1, 3, 6, 12].map(m => (
                <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Active</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Problems</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Premium Until</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={cn("border-b border-border/50 hover:bg-muted/20", i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">{u.problem_count}</td>
                  <td className="px-4 py-3">
                    {u.is_premium ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Crown className="h-3 w-3" /> Premium
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Free
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.premium_until ? new Date(u.premium_until).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTogglePremium(u.id, u.is_premium)}
                      disabled={updating === u.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                        u.is_premium
                          ? "border border-border bg-background hover:bg-muted"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {updating === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : u.is_premium ? (
                        <><X className="h-3 w-3" /> Revoke</>
                      ) : (
                        <><Check className="h-3 w-3" /> Upgrade</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}