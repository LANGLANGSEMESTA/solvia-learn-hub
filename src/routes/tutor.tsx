import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/tutor")({
  head: () => ({ meta: [{ title: "AI Tutors — Solvai" }] }),
  component: TutorPage,
});

const TUTORS = [
  { subject: "math", name: "Pascal", emoji: "🧮", desc: "Mathematics · Patient & step-by-step", color: "from-blue-500 to-indigo-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  { subject: "physics", name: "Quark", emoji: "⚡", desc: "Physics · Energetic & real-world", color: "from-amber-500 to-orange-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  { subject: "chemistry", name: "Bohr", emoji: "🧪", desc: "Chemistry · Methodical & precise", color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  { subject: "biology", name: "Helix", emoji: "🔬", desc: "Biology · Storytelling & vivid", color: "from-rose-500 to-pink-600", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800" },
]

function TutorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/solvai-icon.png" alt="Solvai" className="h-8 w-8 rounded-lg" />
            <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />Pro feature
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Your AI Tutors</h1>
          <p className="mt-2 text-sm text-muted-foreground">Chat with a personal tutor — ask anything, anytime.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TUTORS.map((t) => (
            <button
              key={t.subject}
              onClick={() => navigate({ to: "/tutor/$subject", params: { subject: t.subject } })}
              className={`group flex items-center gap-4 rounded-2xl border p-5 transition hover:shadow-md w-full text-left ${t.bg} ${t.border}`}
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.color} text-2xl shadow-sm`}>
                {t.emoji}
              </div>
              <div className="flex-1">
                <p className="font-serif text-lg font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
              <span className="text-muted-foreground transition group-hover:translate-x-1">→</span>
            </button>
          ))}
        </div>
      </main>
      <Outlet />
    </div>
  );
}