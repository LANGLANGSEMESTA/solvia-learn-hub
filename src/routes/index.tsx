import { createFileRoute } from "@tanstack/react-router";
import {
  Sigma,
  Camera,
  MessageCircle,
  RefreshCw,
  Volume2,
  Flame,
  Globe,
  Zap,
  BookOpen,
  HelpCircle,
  Check,
  Star,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solvia — AI-powered STEM tutor" },
      {
        name: "description",
        content:
          "Solvia explains Math, Physics, and Chemistry the way you want it. Upload a photo, type a question, or scan your textbook.",
      },
      { property: "og:title", content: "Solvia — Solve it. Understand it. Master it." },
      {
        property: "og:description",
        content: "AI-powered STEM tutor for high school and university students.",
      },
    ],
  }),
  component: Index,
});

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sigma className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="font-serif text-xl font-semibold tracking-tight">Solvia</span>
    </div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <button className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted sm:inline-flex">
            Sign in
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
            Start free
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          AI-powered STEM tutor
        </span>
        <h1 className="mt-6 font-serif text-4xl leading-[1.1] font-semibold tracking-tight sm:text-6xl">
          Solve any problem.
          <br />
          <span className="text-primary italic">Actually understand it.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Upload a photo, type your question, or scan your textbook. Solvia explains Math,
          Physics, and Chemistry — the way you want it.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:w-auto">
            Start solving free
            <ArrowRight className="h-4 w-4" />
          </button>
          <button className="inline-flex w-full items-center justify-center rounded-md px-5 py-3 text-sm font-medium text-foreground/80 transition hover:bg-muted sm:w-auto">
            See how it works
          </button>
        </div>

        <DemoCard />
      </div>
    </section>
  );
}

function DemoCard() {
  return (
    <div className="mx-auto mt-14 max-w-xl rounded-xl border border-border bg-card p-5 text-left shadow-[0_8px_30px_-10px_rgba(83,74,183,0.18)] sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sigma className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-medium">Solvia</span>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          Calculus
        </span>
      </div>
      <div className="mt-4 rounded-lg bg-muted/60 px-4 py-3 font-serif text-lg">
        Solve: <span className="text-primary">∫ x² dx</span>
      </div>
      <ol className="mt-4 space-y-3 text-sm">
        {[
          { n: 1, t: "Apply the power rule", d: "For ∫ xⁿ dx, add 1 to the exponent." },
          { n: 2, t: "Increase exponent by 1", d: "x² becomes x³." },
          { n: 3, t: "Divide by new exponent", d: "Result: x³ / 3 + C." },
        ].map((s) => (
          <li key={s.n} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {s.n}
            </span>
            <div>
              <div className="font-medium">{s.t}</div>
              <div className="text-muted-foreground">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
        <div className="text-xs font-medium tracking-wide text-success uppercase">Answer</div>
        <div className="mt-1 font-serif text-lg">x³⁄3 + C</div>
      </div>
    </div>
  );
}

function Stats() {
  const items = [
    { n: "3", l: "STEM subjects" },
    { n: "3", l: "Learning modes" },
    { n: "4", l: "Ways to input" },
  ];
  return (
    <section className="border-y border-border/60 bg-card/40 px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 text-center">
        {items.map((i) => (
          <div key={i.l}>
            <div className="font-serif text-3xl font-semibold text-primary sm:text-4xl">
              {i.n}
            </div>
            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{i.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

type FeatureProps = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: "purple" | "green" | "amber" | "blue";
};

const tintClass: Record<FeatureProps["tint"], string> = {
  purple: "bg-tint-purple text-primary",
  green: "bg-tint-green text-success",
  amber: "bg-tint-amber text-warning-foreground",
  blue: "bg-tint-blue text-info",
};

function FeatureCard({ icon, title, desc, tint }: FeatureProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition hover:shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${tintClass[tint]}`}
      >
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Features() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to <span className="text-primary italic">learn smarter</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            From snap-and-solve to voice explanations — Solvia adapts to how you study.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <FeatureCard
            tint="purple"
            icon={<Camera className="h-5 w-5" />}
            title="Snap & solve"
            desc="Take a photo of any problem and get a step-by-step solution in seconds."
          />
          <FeatureCard
            tint="green"
            icon={<MessageCircle className="h-5 w-5" />}
            title="AI tutor chat"
            desc="Stuck on a step? Ask follow-ups and get clear, patient answers."
          />
          <FeatureCard
            tint="amber"
            icon={<RefreshCw className="h-5 w-5" />}
            title="Similar problems"
            desc="Practice with auto-generated variations until the concept clicks."
          />
          <FeatureCard
            tint="blue"
            icon={<Volume2 className="h-5 w-5" />}
            title="Listen to explanations"
            desc="Hear solutions read aloud — perfect for the bus or the gym."
          />
          <FeatureCard
            tint="purple"
            icon={<Flame className="h-5 w-5" />}
            title="Daily streak"
            desc="Build a study habit. Solvia keeps you accountable, gently."
          />
          <FeatureCard
            tint="green"
            icon={<Globe className="h-5 w-5" />}
            title="Any language"
            desc="Learn in English, Spanish, French — or your native tongue."
          />
        </div>
      </div>
    </section>
  );
}

type ModeProps = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: FeatureProps["tint"];
  featured?: boolean;
};

function ModeCard({ icon, title, desc, tint, featured }: ModeProps) {
  return (
    <div
      className={`relative rounded-xl border bg-card p-6 transition ${
        featured ? "border-primary shadow-[0_10px_40px_-15px_rgba(83,74,183,0.4)]" : "border-border"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most used
        </span>
      )}
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${tintClass[tint]}`}
      >
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Modes() {
  return (
    <section className="bg-card/40 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Three ways to <span className="text-primary italic">understand</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pick the mode that fits the moment — a quick nudge, deep dive, or guided thinking.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          <ModeCard
            tint="amber"
            icon={<Zap className="h-5 w-5" />}
            title="Quick trick"
            desc="The fastest path to the answer, with the one insight you needed."
          />
          <ModeCard
            tint="purple"
            featured
            icon={<BookOpen className="h-5 w-5" />}
            title="Full explanation"
            desc="Every step explained, with the reasoning behind each move."
          />
          <ModeCard
            tint="green"
            icon={<HelpCircle className="h-5 w-5" />}
            title="Socratic"
            desc="Solvia asks you questions, so you discover the answer yourself."
          />
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  name,
  price,
  period,
  features,
  featured,
  cta,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
  cta: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-card p-6 sm:p-8 ${
        featured ? "border-primary shadow-[0_10px_40px_-15px_rgba(83,74,183,0.4)]" : "border-border"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          <Star className="h-3 w-3 fill-current" />
          Most popular
        </span>
      )}
      <div className="font-serif text-lg font-semibold">{name}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-serif text-4xl font-semibold">{price}</span>
        <span className="text-sm text-muted-foreground">/{period}</span>
      </div>
      <ul className="mt-6 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                featured ? "text-primary" : "text-success"
              }`}
            />
            <span className="text-foreground/85">{f}</span>
          </li>
        ))}
      </ul>
      <button
        className={`mt-8 w-full rounded-md px-4 py-2.5 text-sm font-medium transition ${
          featured
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border bg-background hover:bg-muted"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

function Pricing() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple, <span className="text-primary italic">student-friendly</span> pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade when you want unlimited everything.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <PriceCard
            name="Free"
            price="$0"
            period="forever"
            cta="Get started"
            features={[
              "5 problems per day",
              "2 learning modes",
              "3 follow-up questions",
              "1 similar problem",
              "Daily streak tracking",
            ]}
          />
          <PriceCard
            name="Premium"
            price="$2.99"
            period="month"
            featured
            cta="Go premium"
            features={[
              "Unlimited problems",
              "All 3 learning modes",
              "Unlimited follow-ups",
              "Voice explanations",
              "Bookmarks & history",
              "Priority AI responses",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function Waitlist() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.success("You're already on the list!");
        setSent(true);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }
    toast.success("You're in! We'll be in touch soon.");
    setSent(true);
  };

  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-primary px-6 py-14 text-primary-foreground sm:px-12 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Be the first to know
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Join the waitlist and we'll send you an invite the moment Solvia opens up.
          </p>
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row"
          >
            <input
              type="email"
              required
              disabled={sent || loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-md bg-primary-foreground/10 px-4 py-2.5 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none ring-1 ring-primary-foreground/20 focus:ring-primary-foreground/50 disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={sent || loading}
              className="rounded-md bg-primary-foreground px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary-foreground/90 disabled:opacity-80"
            >
              {sent ? "You're in ✓" : loading ? "Joining…" : "Join waitlist"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <Logo />
        <p className="text-xs text-muted-foreground sm:text-sm">
          © 2025 Solvia · Solve it. Understand it. Master it.
        </p>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Modes />
        <Pricing />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}
