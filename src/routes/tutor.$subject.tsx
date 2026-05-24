import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithTutor } from "@/lib/solve.functions";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MathRenderer } from "@/components/MathRenderer";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tutor/$subject")({
  component: TutorChatPage,
});

const TUTOR_INFO: Record<string, { name: string; emoji: string; color: string; greeting: string }> = {
  math: { name: "Pascal", emoji: "🧮", color: "bg-blue-500", greeting: "Hey! I'm Pascal, your math tutor. What would you like to explore today? You can ask me anything — from basic algebra to advanced calculus!" },
  physics: { name: "Quark", emoji: "⚡", color: "bg-amber-500", greeting: "Hey there! I'm Quark, your physics tutor! The universe is full of fascinating mysteries — what would you like to understand today?" },
  chemistry: { name: "Bohr", emoji: "🧪", color: "bg-emerald-500", greeting: "Hello! I'm Bohr, your chemistry tutor. Let's explore the world of atoms and molecules together. What's on your mind?" },
  biology: { name: "Helix", emoji: "🔬", color: "bg-rose-500", greeting: "Hi! I'm Helix, your biology tutor. Life is full of amazing stories — from DNA to ecosystems. What would you like to learn today?" },
}

type Msg = { role: "user" | "assistant"; content: string }

function TutorChatPage() {
  const { subject } = Route.useParams();
  const { user } = useAuth();
  const tutor = TUTOR_INFO[subject] ?? TUTOR_INFO.math;
  const callChat = useServerFn(chatWithTutor);

  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput("");
    const newHistory: Msg[] = [...history, { role: "user", content: message }];
    setHistory(newHistory);
    setLoading(true);
    try {
      const res = await callChat({ data: { subject, history, message } });
      setHistory([...newHistory, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      if (e?.message === "LIMIT_PRO_ONLY") {
        toast.error("AI Tutors are available for Pro plan only.");
      } else {
        toast.error(e?.message || "Something went wrong.");
      }
      setHistory(history);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/tutor" className="text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-lg text-white", tutor.color)}>
              {tutor.emoji}
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">{tutor.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{subject} tutor</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 pb-32">
        {/* Greeting */}
        <div className="flex gap-3 mb-4">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm text-white mt-1", tutor.color)}>
            {tutor.emoji}
          </div>
          <div className="rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-sm max-w-[80%]">
            {tutor.greeting}
          </div>
        </div>

        {/* Messages */}
        {history.map((m, i) => (
          <div key={i} className={cn("flex gap-3 mb-4", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm text-white mt-1", tutor.color)}>
                {tutor.emoji}
              </div>
            )}
            <div className={cn(
              "rounded-2xl px-4 py-3 text-sm max-w-[80%]",
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-muted rounded-tl-none overflow-x-auto"
            )}>
              <MathRenderer text={m.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mb-4">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm text-white", tutor.color)}>
              {tutor.emoji}
            </div>
            <div className="rounded-2xl rounded-tl-none bg-muted px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/60 bg-background/95 backdrop-blur pb-safe">
        <form onSubmit={sendMessage} className="mx-auto flex max-w-3xl gap-2 px-4 py-3 sm:px-6">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ask ${tutor.name} anything...`}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}