import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sigma, Check, Zap, ArrowLeft } from "lucide-react";
import { createPayment } from "@/lib/payment.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [{ title: "Upgrade — Solvai" }],
  }),
  component: UpgradePage,
});

function UpgradePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const callCreatePayment = useServerFn(createPayment);

  const price = billing === "monthly" ? 29000 : 239000;
  const priceDisplay = billing === "monthly" ? "Rp29.000" : "Rp239.000";
  const period = billing === "monthly" ? "month" : "year";
  const months = billing === "monthly" ? 1 : 12;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { token } = await callCreatePayment({ data: { price, months } });
      const snap = (window as any).snap;
      snap.pay(token, {
        onSuccess: () => {
          window.location.href = "/solve?upgraded=1";
        },
        onPending: () => {
          window.location.href = "/solve?payment=pending";
        },
        onError: () => {
          alert("Payment failed. Please try again.");
        },
      });
    } catch (e: any) {
      alert(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
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
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-semibold">Upgrade to Premium</h1>
          <p className="mt-2 text-muted-foreground">Learn without limits with Solvai Premium</p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-medium transition",
                billing === "monthly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-muted"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "relative rounded-lg px-5 py-2 text-sm font-medium transition",
                billing === "yearly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-muted"
              )}
            >
              Yearly
              <span className="absolute -top-2.5 -right-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                -31%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/30 bg-card p-6 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="font-serif text-4xl font-bold">{priceDisplay}</p>
              <p className="text-sm text-muted-foreground">/{period}</p>
              {billing === "yearly" && (
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  Save Rp109.000 vs monthly
                </p>
              )}
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Popular
            </span>
          </div>

          <ul className="mt-6 space-y-3">
            {[
              "Unlimited problems per day",
              "All 3 modes: Quick, Full, Socratic",
              "Photo OCR for problem scanning",
              "Unlimited follow-up chat",
              "Bookmarks & history",
              "Priority access to new features",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpgrade}
            disabled={loading || !user}
            className="mt-8 w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Loading..." : `Pay ${priceDisplay}`}
          </button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            GoPay · OVO · DANA · Bank Transfer · QRIS
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By paying, you agree to Solvai's terms and conditions.
        </p>
      </main>
    </div>
  );
}