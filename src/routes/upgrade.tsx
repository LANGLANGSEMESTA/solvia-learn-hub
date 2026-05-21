import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Zap, ArrowLeft, Lock } from "lucide-react";
import { createPayment } from "@/lib/payment.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [{ title: "Upgrade — Solvai" }],
  }),
  component: UpgradePage,
});

const PLANS = {
  basic: {
    name: "Basic",
    monthly: { price: 49000, display: "Rp49.000", months: 1 },
    yearly:  { price: 399000, display: "Rp399.000", months: 12, perMonth: "Rp33.000/mo", save: "Save Rp189.000" },
    features: [
      "Unlimited Quick & Full explanation",
      "1 free trial/day for Socratic & Multi",
      "Math, Physics & Chemistry",
      "Unlimited follow-up chat",
      "Bookmarks & history",
    ],
    notIncluded: [
      "Unlimited Socratic & Multi-method",
      "Explanation level (Kid → Expert)",
    ],
  },
  pro: {
    name: "Pro",
    monthly: { price: 89000, display: "Rp89.000", months: 1 },
    yearly:  { price: 699000, display: "Rp699.000", months: 12, perMonth: "Rp58.000/mo", save: "Save Rp369.000" },
    features: [
      "Everything in Basic",
      "Unlimited Socratic & Multi-method",
      "Explanation level: Kid → Expert",
      "Math, Physics & Chemistry",
      "Unlimited follow-up chat",
      "Bookmarks & history",
      "Priority access to new features",
    ],
    notIncluded: [],
  },
}

function UpgradePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const callCreatePayment = useServerFn(createPayment);

  async function handleUpgrade(plan: "basic" | "pro") {
    setLoading(plan);
    try {
      const p = PLANS[plan][billing];
      const { token } = await callCreatePayment({ data: { price: p.price, months: p.months } });
      const snap = (window as any).snap;
      snap.pay(token, {
        onSuccess: () => { window.location.href = "/solve?upgraded=1"; },
        onPending: () => { window.location.href = "/solve?payment=pending"; },
        onError: () => { alert("Payment failed. Please try again."); },
      });
    } catch (e: any) {
      alert(e?.message || "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/solvai-icon.png" alt="Solvai" className="h-8 w-8 rounded-lg" />
            <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
          </Link>
          <Link to="/solve" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-semibold">Choose your plan</h1>
          <p className="mt-2 text-muted-foreground">Unlock more with Solvai</p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex rounded-xl border border-border bg-card p-1">
            <button onClick={() => setBilling("monthly")} className={cn("rounded-lg px-5 py-2 text-sm font-medium transition", billing === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted")}>
              Monthly
            </button>
            <button onClick={() => setBilling("yearly")} className={cn("relative rounded-lg px-5 py-2 text-sm font-medium transition", billing === "yearly" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted")}>
              Yearly
              <span className="absolute -top-2.5 -right-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">-33%</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(["basic", "pro"] as const).map((planKey) => {
            const plan = PLANS[planKey]
            const p = plan[billing]
            const isPro = planKey === "pro"
            return (
              <div key={planKey} className={cn("rounded-2xl border bg-card p-6 shadow-sm flex flex-col", isPro ? "border-primary/50 ring-2 ring-primary/20" : "border-border")}>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-lg font-semibold">{plan.name}</span>
                  {isPro && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Most Popular</span>}
                </div>

                <div className="mt-4">
                  <span className="font-serif text-3xl font-bold">{p.display}</span>
                  <span className="text-sm text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</span>
                  {billing === "yearly" && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground">{"perMonth" in p ? p.perMonth : ""}</p>
                      <p className="text-xs text-emerald-600 font-medium">{"save" in p ? p.save : ""}</p>
                    </div>
                  )}
                </div>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/60">
                      <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(planKey)}
                  disabled={!!loading || !user}
                  className={cn("mt-6 w-full rounded-xl py-3.5 text-sm font-semibold transition disabled:opacity-50",
                    isPro ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-primary text-primary hover:bg-primary/5"
                  )}
                >
                  {loading === planKey ? "Loading..." : `Get ${plan.name} — ${p.display}`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Free plan comparison */}
        <div className="mt-6 rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Free plan includes:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>✓ Quick mode — 10x/day</span>
            <span>✓ Math only</span>
            <span>✓ 1 trial/day per mode</span>
            <span>✓ Weakness Radar</span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          GoPay · OVO · DANA · Bank Transfer · QRIS
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          By paying, you agree to Solvai's terms and conditions.
        </p>
      </main>
    </div>
  );
}