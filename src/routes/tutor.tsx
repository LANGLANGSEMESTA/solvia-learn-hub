import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/tutor")({
  head: () => ({ meta: [{ title: "AI Tutors — Solvai" }] }),
  component: TutorPage,
});

const TUTORS = [
  { subject: "math", name: "Pascal", emoji: "🧮", desc: "Mathematics · Patient & step-by-step", ... },
  { subject: "physics", name: "Quark", emoji: "⚡", desc: "Physics · Energetic & real-world", ... },
  { subject: "chemistry", name: "Bohr", emoji: "🧪", desc: "Chemistry · Methodical & precise", ... },
  { subject: "biology", name: "Helix", emoji: "🔬", desc: "Biology · Storytelling & vivid", ... },
]

function TutorPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/solvai-icon.png" alt="Solvai" className="h-8 w-8 rounded-lg" />
            <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
          </Link>
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
            <Link key={t.subject} to="/tutor/$subject" params={{ subject: t.subject }}
              className={`group flex items-center gap-4 rounded-2xl border p-5 transition hover:shadow-md ${t.bg} ${t.border}`}>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.color} text-2xl shadow-sm`}>
                {t.emoji}
              </div>
              <div className="flex-1">
                <p className="font-serif text-lg font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
              <span className="text-muted-foreground transition group-hover:translate-x-1">→</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}