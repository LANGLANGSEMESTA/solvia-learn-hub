import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUsers, updateUserPremium } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Users, Crown, BarChart2, Search, Check, X, Loader2, ChevronDown } from "lucide-react";

const ADMIN_EMAILS = ["irsanwu@gmail.com", "irsanwuu@gmail.com"];

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Solvai" }] }),
  component: AdminPage,
});

type User = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in: string;
  is_premium: boolean;
  plan: string;
  premium_until: string | null;
  problem_count: number;
};

type UpgradeConfig = {
  plan: "basic" | "pro";
  billing: "monthly" | "yearly";
}

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ userId: string; email: string } | null>(null);
  const [upgradeConfig, setUpgradeConfig] = useState<UpgradeConfig>({ plan: "basic", billing: "monthly" });

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

  async function handleUpgrade() {
    if (!upgradeModal) return;
    setUpdating(upgradeModal.userId);
    const months = upgradeConfig.billing === "yearly" ? 12 : 1;
    try {
      await callUpdatePremium({
        data: {
          userId: upgradeModal.userId,
          isPremium: true,
          months,
          plan: upgradeConfig.plan,
          billing: upgradeConfig.billing,
        },
      });
      setUsers(prev => prev.map(u =>
        u.id === upgradeModal.userId
          ? {
              ...u,
              is_premium: true,
              plan: upgradeConfig.plan,
              premium_until: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString(),
            }
          : u
      ));
      toast.success(`Upgraded to ${upgradeConfig.plan} (${upgradeConfig.billing})`);
      setUpgradeModal(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    } finally {
      setUpdating(null);
    }
  }

  async function handleRevoke(userId: string) {
    setUpdating(userId);
    try {
      await callUpdatePremium({ data: { userId, isPremium: false, plan: "free" } });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_premium: false, plan: "free", premium_until: null } : u
      ));
      toast.success("Premium revoked");
    } catch (e: any) {
      toast.error(e?.message || "Failed to revoke");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()));
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.is_premium).length;
  const totalProblems = users.reduce((a, u) => a + u.problem_count, 0);

  if (loading || fetching) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/solvai-icon.png" alt="Solvai" className="h-8 w-8 rounded-lg" />
            <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
          </Link>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Users className="h-4 w-4" /> Total Users</div>
            <div className="font-serif text-3xl font-bold">{totalUsers}</div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-primary text-sm mb-1"><Crown className="h-4 w-4" /> Premium Users</div>
            <div className="font-serif text-3xl font-bold text-primary">{premiumUsers}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><BarChart2 className="h-4 w-4" /> Total Problems</div>
            <div className="font-serif text-3xl font-bold">{totalProblems}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Active</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Problems</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Until</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={cn("border-b border-border/50 hover:bg-muted/20", i % 2 !== 0 && "bg-muted/10")}>
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3">{u.problem_count}</td>
                  <td className="px-4 py-3">
                    {u.is_premium ? (
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        u.plan === "pro" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}>
                        <Crown className="h-3 w-3" />{u.plan === "pro" ? "Pro" : "Basic"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.premium_until ? new Date(u.premium_until).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setUpgradeConfig({ plan: "basic", billing: "monthly" }); setUpgradeModal({ userId: u.id, email: u.email }); }}
                        disabled={updating === u.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {updating === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Crown className="h-3 w-3" /> Upgrade</>}
                      </button>
                      {u.is_premium && (
                        <button
                          onClick={() => handleRevoke(u.id)}
                          disabled={updating === u.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          <X className="h-3 w-3" /> Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Upgrade Modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="font-serif text-lg font-semibold mb-1">Upgrade User</h2>
            <p className="text-sm text-muted-foreground mb-4">{upgradeModal.email}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["basic", "pro"] as const).map(p => (
                    <button key={p} onClick={() => setUpgradeConfig(c => ({ ...c, plan: p }))}
                      className={cn("rounded-xl border p-3 text-sm font-semibold transition capitalize",
                        upgradeConfig.plan === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}>
                      {p === "pro" ? "⭐ Pro" : "Basic"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Billing</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["monthly", "yearly"] as const).map(b => (
                    <button key={b} onClick={() => setUpgradeConfig(c => ({ ...c, billing: b }))}
                      className={cn("rounded-xl border p-3 text-sm font-semibold transition capitalize",
                        upgradeConfig.billing === b ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}>
                      {b === "yearly" ? "Yearly (12mo)" : "Monthly (1mo)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 text-sm">
                <span className="text-muted-foreground">Duration: </span>
                <span className="font-semibold">{upgradeConfig.billing === "yearly" ? "12 months" : "1 month"}</span>
                <span className="text-muted-foreground ml-2">· Plan: </span>
                <span className="font-semibold capitalize">{upgradeConfig.plan}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setUpgradeModal(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button onClick={handleUpgrade} disabled={updating === upgradeModal.userId}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {updating === upgradeModal.userId ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Confirm Upgrade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}