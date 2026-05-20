import { useState, useEffect } from "react";
import { Zap, BookOpen, HelpCircle, Camera, X } from "lucide-react";

export function WelcomeModal({ userName }: { userName?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
  if (typeof window === "undefined") return;
  const seen = localStorage.getItem("solvai_welcome_seen");
  if (!seen) setOpen(true);
}, []);

  function dismiss() {
    localStorage.setItem("solvai_welcome_seen", "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl">🎓</span>
          </div>
          <h2 className="font-serif text-2xl font-semibold">
            Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Solvai is your AI-powered STEM tutor. Here's how to get started:
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Upload or snap a problem</p>
              <p className="text-xs text-muted-foreground">Photo from your textbook or type it directly — Solvai reads it all.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <div className="mt-0.5 flex gap-1">
              <Zap className="h-4 w-4 text-amber-500" />
              <BookOpen className="h-4 w-4 text-primary" />
              <HelpCircle className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-medium">3 learning modes</p>
              <p className="text-xs text-muted-foreground">Quick trick, Full explanation, or Socratic — pick what fits the moment.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <span className="mt-0.5 text-lg">🎚️</span>
            <div>
              <p className="text-sm font-medium">Choose your level</p>
              <p className="text-xs text-muted-foreground">From "A Kid" to "Expert" — explanations tailored to your level.</p>
            </div>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Start solving 🚀
        </button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          You have 10 free problems per day.
        </p>
      </div>
    </div>
  );
}