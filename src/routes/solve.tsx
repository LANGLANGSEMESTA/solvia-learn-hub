import { createFileRoute, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";
import { BlockMath } from 'react-katex';
import { MathRenderer } from "@/components/MathRenderer";
import { WelcomeModal } from "@/components/WelcomeModal";
import {
  Sigma, ArrowRight, Keyboard, Zap, BookOpen, HelpCircle,
  Sparkles, Upload, Volume2, RefreshCw, MessageCircle, Send, Lightbulb,
  CheckCircle2, Bookmark, Loader2, Copy, Share2, Printer, Lock, Star, Brain, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { solveProblem, chatFollowUp, evaluateSocraticAnswer, getDailyUsage, detectTopic, updateWeaknessTracker } from "@/lib/solve.functions";
import { createShareLink } from "@/lib/share.functions";
import { useAuth, signOut } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { StreakBadge } from "@/components/StreakBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeaknessRadar } from "@/components/WeaknessRadar";
import { WeeklyStreak } from "@/components/WeeklyStreak";

const EXAMPLES: Record<Subject, string[]> = {
  Math: [
    "Find the derivative of sin(3x)·cos(2x)",
    "Solve: 2x² − 5x − 3 = 0",
    "Evaluate ∫₀^π sin²(x) dx",
  ],
  Physics: [
    "A 2 kg block slides down a frictionless 30° incline. Find its acceleration.",
    "Find the equivalent resistance of two 6Ω resistors in parallel.",
    "Calculate the period of a pendulum with length 1 m.",
  ],
  Chemistry: [
    "Balance: C₃H₈ + O₂ → CO₂ + H₂O",
    "Find the pH of a 0.01 M HCl solution.",
    "How many grams are in 0.5 mol of NaCl?",
  ],
  Biology: [
    "Explain the difference between mitosis and meiosis.",
    "How does photosynthesis work?",
    "What is the role of DNA in protein synthesis?",
  ],
};

export const Route = createFileRoute("/solve")({
  head: () => ({
    meta: [
      { title: "Solve — Solvai" },
      { name: "description", content: "Solve any STEM problem with Solvai. Upload a photo, type your question, or scan a PDF." },
    ],
  }),
  component: SolvePage,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src="/solvai-icon.png" alt="Solvai" className="h-8 w-8 rounded-lg" />
      <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
    </Link>
  );
}

function Navbar({ refreshKey }: { refreshKey?: unknown }) {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 sm:flex">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted">Home</Link>
          <Link to="/solve" className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">Solve</Link>
          <Link to="/history" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted">History</Link>
          <Link to="/practice" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted">Practice</Link>
          <Link to="/daily" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted">Daily</Link>
          {user && <Link to="/profile" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted">Profile</Link>}
          {user && (user.email === "irsanwu@gmail.com" || user.email === "irsanwuu@gmail.com") && (
            <Link to="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-primary transition hover:bg-muted">Admin</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && <StreakBadge refreshKey={refreshKey} />}
          {loading ? null : user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <button onClick={() => signOut()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted sm:inline-flex">Sign in</Link>
              <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
                Start free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

type TabKey = "upload" | "type";
type Subject = "Math" | "Physics" | "Chemistry" | "Biology";
type Mode = "quick" | "full" | "socratic" | "multi";
type Level = "kid" | "middle" | "high" | "university" | "expert";
type Plan = "free" | "basic" | "pro";

type DailyUsage = {
  plan: Plan;
  counts: Record<string, number>;
  limits: Record<string, number>;
  allowedSubjects: string[];
};

const TABS: { key: TabKey; label: string; icon: typeof Upload }[] = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "type", label: "Type", icon: Keyboard },
];

const LEVELS: { key: Level; label: string }[] = [
  { key: "kid", label: "A Kid" },
  { key: "middle", label: "Middle School" },
  { key: "high", label: "High School" },
  { key: "university", label: "University" },
  { key: "expert", label: "Expert" },
];

type QuickResult = { trick: string; answer: string; note?: string };
type FullStep = { title: string; content: string; formula?: string };
type FullResult = { concept: string; steps: FullStep[]; answer: string; graph?: { expressions: string[]; note?: string } };
type SocraticResult = { hint: string; question: string; encouragement: string };
type MultiMethod = { name: string; steps: FullStep[]; answer: string };
type MultiResult = { concept: string; methods: MultiMethod[] };
type AnyResult = QuickResult | FullResult | SocraticResult | MultiResult;
type ChatMsg = { role: "user" | "assistant"; content: string };

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, data] = dataUrl.split(",");
      const mediaType = /data:(.*?);base64/.exec(meta)?.[1] || file.type || "image/png";
      resolve({ base64: data, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function ocrImage(file: File): Promise<string> {
  const worker = await createWorker("eng+ind");
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  return text.trim();
}

function formatResultForClipboard(r: AnyResult, mode: Mode | null): string {
  if (mode === "quick") { const q = r as QuickResult; return `Trick: ${q.trick}\n\nAnswer: ${q.answer}${q.note ? `\n\nNote: ${q.note}` : ""}`; }
  if (mode === "full") { const f = r as FullResult; const steps = f.steps.map((s, i) => `${i + 1}. ${s.title}\n${s.content}${s.formula ? `\n   ${s.formula}` : ""}`).join("\n\n"); return `Concept: ${f.concept}\n\n${steps}\n\nAnswer: ${f.answer}`; }
  if (mode === "socratic") { const s = r as SocraticResult; return `Hint: ${s.hint}\n\nQuestion: ${s.question}\n\n${s.encouragement}`; }
  if (mode === "multi") { const m = r as MultiResult; return m.methods.map(method => `[${method.name}]\n` + method.steps.map((s, i) => `${i + 1}. ${s.title}\n${s.content}`).join("\n\n") + `\n\nAnswer: ${method.answer}`).join("\n\n---\n\n"); }
  return JSON.stringify(r, null, 2);
}

function detectPlottableExpressions(problemText: string): string[] {
  const found: string[] = [];
  const matches = problemText.match(/y\s*=\s*[^\n,;]+/gi);
  if (matches) matches.forEach(m => { const clean = m.trim().replace(/\s+/g, " "); if (!found.includes(clean)) found.push(clean); });
  return found.slice(0, 4);
}

function UpgradeModal({ reason, onClose }: { reason: string; onClose: () => void }) {
  const messages: Record<string, { title: string; desc: string; cta: string }> = {
    LIMIT_QUICK: { title: "Quick limit reached", desc: "You've used all 10 free Quick solves today. Upgrade to Basic for unlimited access.", cta: "Upgrade to Basic — Rp49.000/mo" },
    LIMIT_TRIAL: { title: "Trial used for today", desc: "You've used your free trial for this mode today. Upgrade to unlock unlimited access.", cta: "See upgrade options" },
    LIMIT_SUBJECT: { title: "Physics & Chemistry are premium", desc: "Free plan includes Math only. Upgrade to Basic or Pro for all 3 subjects.", cta: "Upgrade to Basic — Rp49.000/mo" },
    LIMIT_LEVEL: { title: "Level selection is Pro only", desc: "Choosing explanation level (Kid → Expert) requires a Pro plan.", cta: "Upgrade to Pro — Rp89.000/mo" },
    default: { title: "Upgrade required", desc: "This feature requires a paid plan.", cta: "See upgrade options" },
  }
  const m = messages[reason] ?? messages.default
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-serif text-xl font-semibold">{m.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/upgrade" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Sparkles className="h-4 w-4" />{m.cta}
          </Link>
          <button onClick={onClose} className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted">Maybe later</button>
        </div>
      </div>
    </div>
  )
}

const LOADING_TEXTS = [
  "Analyzing your problem...",
  "Building step-by-step solution...",
  "Checking the math...",
  "Almost done...",
]

function RotatingText() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => { setIdx(i => (i + 1) % LOADING_TEXTS.length) }, 2500)
    return () => clearInterval(interval)
  }, [])
  return <span>{LOADING_TEXTS[idx]}</span>
}

function MobileNav() {
  const { user } = useAuth();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const navItems = [
    { to: "/solve", icon: Sparkles, label: "Solve" },
    { to: "/daily", icon: Star, label: "Daily" },
    { to: "/practice", icon: Brain, label: "Practice" },
    { to: "/history", icon: BookOpen, label: "History" },
    { to: "/profile", icon: User, label: "Profile" },
  ]

  if (!mounted) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur sm:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          if (to === "/profile" && !user) return null
          const active = pathname === to
          return (
            <Link key={to} to={to} className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition rounded-xl",
              active
                ? "text-primary font-semibold bg-primary/10"
                : "text-foreground/50 hover:text-foreground"
            )}>
              <Icon className={cn("h-5 w-5 transition", active && "scale-110")} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
function SolvePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const [savedId, setSavedId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [tab, setTab] = useState<TabKey>("upload");
  const [photo, setPhoto] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [subject, setSubject] = useState<Subject>("Math");
  const [mode, setMode] = useState<Mode>("quick");
  const [level, setLevel] = useState<Level>("high");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnyResult | null>(null);
  const [resultMode, setResultMode] = useState<Mode | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const lastContextRef = useRef<{ text?: string; imageBase64?: string; imageMediaType?: string; pdfBase64?: string; subject: string } | null>(null);
  const callSolve = useServerFn(solveProblem);
  const callChat = useServerFn(chatFollowUp);
  const callShare = useServerFn(createShareLink);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage | null>(null);
  const callGetDailyUsage = useServerFn(getDailyUsage);

  useEffect(() => {
    if (user) callGetDailyUsage({ data: undefined }).then(setDailyUsage).catch(console.error);
  }, [user, savedId]);

  const plan = dailyUsage?.plan ?? "free"
  const counts = dailyUsage?.counts ?? {}
  const limits = dailyUsage?.limits ?? { quick: 10, full: 1, socratic: 1, multi: 1 }
  const allowedSubjects = dailyUsage?.allowedSubjects ?? ["Math"]

  const isModeTrialUsed = (m: Mode) => (counts[m] ?? 0) >= (limits[m] ?? 0)
  const isModeLocked = (m: Mode) => {
    if (plan === "pro") return false
    if (m === "quick") return isModeTrialUsed("quick")
    if (m === "full") return plan === "free" && isModeTrialUsed("full")
    if (m === "socratic") return plan !== "pro" && isModeTrialUsed("socratic")
    if (m === "multi") return plan !== "pro" && isModeTrialUsed("multi")
    return false
  }

  const getModeDesc = (m: Mode) => {
    if (m === "quick") { if (plan === "free") return `${counts.quick ?? 0}/${limits.quick} today`; return "Fast answer + shortcut" }
    if (m === "full") { if (plan === "free") return isModeTrialUsed("full") ? "Trial used · Basic+" : "1 free trial/day"; return "Step by step" }
    if (m === "socratic") { if (plan !== "pro") return isModeTrialUsed("socratic") ? "Trial used · Pro" : "1 free trial/day"; return "Guided hints" }
    if (m === "multi") { if (plan !== "pro") return isModeTrialUsed("multi") ? "Trial used · Pro" : "1 free trial/day"; return "3 ways to solve" }
    return ""
  }

  const hasInput = (tab === "upload" && (!!photo || !!pdf)) || (tab === "type" && text.trim().length > 0)

  async function buildPayload() {
    const payload: any = { mode, subject, level };
    if (tab === "type") payload.text = text.trim();
    else if (tab === "upload" && photo) { payload.text = await ocrImage(photo); }
    else if (tab === "upload" && pdf) { const { base64 } = await fileToBase64(pdf); payload.pdfBase64 = base64; }
    return payload;
  }

  async function handleSolve() {
    if (!hasInput || loading) return;
    setLoading(true); setResult(null); setChatOpen(false); setChatHistory([]); setSavedId(null); setBookmarked(false);
    try {
      const payload = await buildPayload();
      lastContextRef.current = { text: payload.text, imageBase64: payload.imageBase64, imageMediaType: payload.imageMediaType, pdfBase64: payload.pdfBase64, subject };
      const res = await callSolve({ data: payload });
      const fullRes = res.result as FullResult;
      if (mode === "full" && !fullRes.graph?.expressions?.length) {
        const exprs = detectPlottableExpressions(payload.text || "");
        if (exprs.length) fullRes.graph = { expressions: exprs };
      }
      setResult(res.result as AnyResult);
      setResultMode(mode);
      const topic = detectTopic(payload.text || lastContextRef.current?.text || "");
      updateWeaknessTracker(topic);
      if (user) {
        const inputType = payload.imageBase64 ? "image" : payload.pdfBase64 ? "pdf" : "text";
        const { data, error } = await supabase.from("problems").insert({ user_id: user.id, subject, mode, input_type: inputType, input_text: payload.text || null, result: res.result as any }).select("id").single();
        if (!error && data) setSavedId(data.id);
      }
      callGetDailyUsage({ data: undefined }).then(setDailyUsage).catch(console.error);
    } catch (e: any) {
      const msg: string = e?.message ?? ""
      if (msg.startsWith("LIMIT_")) { setUpgradeReason(msg.split(":")[0]) }
      else { toast.error(msg || "Something went wrong. Please try again."); }
    } finally { setLoading(false); }
  }

  async function toggleBookmark() {
    if (!savedId) { if (!user) toast.error("Sign in to bookmark problems"); return; }
    const next = !bookmarked; setBookmarked(next);
    const { error } = await supabase.from("problems").update({ bookmarked: next }).eq("id", savedId);
    if (error) { setBookmarked(!next); toast.error("Could not update bookmark"); }
    else { toast.success(next ? "Bookmarked" : "Removed from bookmarks"); }
  }

  async function handleTrySimilar() {
    if (!lastContextRef.current || loading) return;
    setLoading(true);
    try {
      const ctx = lastContextRef.current;
      const res = await callSolve({ data: { mode: resultMode || mode, level, subject: ctx.subject, text: `Generate a different but similar ${ctx.subject} problem to the previous one and solve it using the same format.` + (ctx.text ? `\n\nPrevious problem: ${ctx.text}` : ""), imageBase64: ctx.imageBase64, imageMediaType: ctx.imageMediaType, pdfBase64: ctx.pdfBase64 } as any });
      setResult(res.result as AnyResult); setChatOpen(false); setChatHistory([]);
    } catch (e: any) { toast.error(e?.message || "Failed to generate similar problem."); }
    finally { setLoading(false); }
  }

  function speakResult() {
    if (!result) return;
    let text = "";
    if (resultMode === "quick") { const r = result as QuickResult; text = `${r.trick}. Answer: ${r.answer}. ${r.note || ""}`; }
    else if (resultMode === "full") { const r = result as FullResult; text = `${r.concept}. ` + r.steps.map((s, i) => `Step ${i + 1}: ${s.title}. ${s.content}`).join(" ") + ` Final answer: ${r.answer}.`; }
    else if (resultMode === "socratic") { const r = result as SocraticResult; text = `${r.hint}. ${r.question}. ${r.encouragement}`; }
    else if (resultMode === "multi") { const r = result as MultiResult; text = r.concept + ". " + r.methods.map(m => `${m.name}: ${m.steps.map(s => s.content).join(" ")} Answer: ${m.answer}`).join(" "); }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const isIndonesian = /\b(dan|yang|adalah|dengan|untuk|tidak|ini|itu|dari|ke|di|pada|atau|juga|sudah|akan|dapat|karena|jadi|maka)\b/i.test(text);
      u.lang = /[\u4e00-\u9fff]/.test(text) ? "zh-CN" : isIndonesian ? "id-ID" : "en-US";
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => v.lang.startsWith(u.lang.split("-")[0]));
      if (matchingVoice) u.voice = matchingVoice;
      window.speechSynthesis.speak(u);
    } catch { toast.error("Speech synthesis not supported in this browser."); }
  }

  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading || !lastContextRef.current) return;
    const message = chatInput.trim(); setChatInput("");
    const newHistory = [...chatHistory, { role: "user" as const, content: message }];
    setChatHistory(newHistory); setChatLoading(true);
    try {
      const ctx = lastContextRef.current;
      const res = await callChat({ data: { mode: resultMode || mode, subject: ctx.subject, originalText: ctx.text, imageBase64: ctx.imageBase64, imageMediaType: ctx.imageMediaType, pdfBase64: ctx.pdfBase64, history: chatHistory, message } as any });
      setChatHistory([...newHistory, { role: "assistant", content: res.reply }]);
    } catch (e: any) { toast.error(e?.message || "Failed to send message."); setChatHistory(chatHistory); }
    finally { setChatLoading(false); }
  }

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar refreshKey={savedId} />
      <WelcomeModal userName={user?.user_metadata?.full_name || user?.email} />
      <main className="mx-auto w-full max-w-[680px] px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
        {user && <WeeklyStreak userId={user.id} />}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />AI-powered STEM tutor
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Solve a problem</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">Upload, type, or snap your STEM question.</p>
          {dailyUsage && plan === "free" && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: limits.quick }).map((_, i) => (
                  <div key={i} className={cn("h-1.5 w-4 rounded-full transition", i < (counts.quick ?? 0) ? "bg-primary" : "bg-border")} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{counts.quick ?? 0}/{limits.quick} Quick today</span>
              {(counts.quick ?? 0) >= limits.quick && <Link to="/upgrade" className="text-xs font-medium text-primary hover:underline">Upgrade →</Link>}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((t) => {
            const Icon = t.icon; const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={cn("inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition sm:text-sm", active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted")}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {tab === "upload" && (
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (!f) return; if (f.type.startsWith("image/")) { setPhoto(f); setPdf(null); } else if (f.type === "application/pdf") { setPdf(f); setPhoto(null); } }} className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 text-center transition hover:border-primary/60 hover:bg-primary/10">
  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-2">
    <Upload className="h-8 w-8 text-primary" strokeWidth={1.5} />
  </div>
  <p className="mt-2 text-sm font-semibold">{photo ? photo.name : pdf ? pdf.name : "Drop your photo or PDF here"}</p>
  <p className="mt-1 text-xs text-muted-foreground">Accepts JPG, PNG, PDF — up to 10MB</p>
              <label className="mt-4 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
  <Upload className="h-4 w-4" />
  {photo ? "Change file" : pdf ? "Change file" : "Choose file"}
  <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" className="hidden"
    onChange={(e) => { const f = e.target.files?.[0] ?? null; if (!f) { setPhoto(null); setPdf(null); return; } if (f.type === "application/pdf") { setPdf(f); setPhoto(null); } else { setPhoto(f); setPdf(null); } }} />
</label>
            </div>
          )}
          {tab === "type" && (
            <div className="space-y-3">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Type your math, physics, or chemistry problem here..." className="w-full rounded-xl border border-border bg-card p-4 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Try an example:</div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES[subject].map((ex) => (<button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80 transition hover:border-primary/40 hover:bg-muted">{ex}</button>))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium">Subject</label>
            {plan === "free" && <span className="text-xs text-muted-foreground">Math only on free plan</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["Math", "Physics", "Chemistry", "Biology"] as Subject[]).map((s) => {
              const locked = !allowedSubjects.includes(s)
              return (
                <button key={s} onClick={() => { if (locked) { setUpgradeReason("LIMIT_SUBJECT"); return; } setSubject(s); }}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition",
                    subject === s && !locked ? "border-primary bg-primary/10 text-primary" :
                    locked ? "border-border bg-card text-foreground/40 cursor-not-allowed" :
                    "border-border bg-card text-foreground/70 hover:bg-muted")}>
                  {s === "Math" ? "🧮 Math" : s === "Physics" ? "⚡ Physics" : s === "Chemistry" ? "🧪 Chemistry" : "🔬 Biology"}{locked && <Lock className="h-3 w-3" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-8">
          <label className="mb-3 block text-sm font-medium">Mode</label>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <ModeCard active={mode === "quick"} locked={isModeLocked("quick")} onClick={() => { if (isModeLocked("quick")) { setUpgradeReason("LIMIT_QUICK"); return; } setMode("quick"); }} icon={<Zap className="h-5 w-5" />} title="Quick trick" desc={getModeDesc("quick")} modeKey="quick" />
            <ModeCard active={mode === "full"} locked={isModeLocked("full")} onClick={() => { if (isModeLocked("full")) { setUpgradeReason("LIMIT_TRIAL"); return; } setMode("full"); }} icon={<BookOpen className="h-5 w-5" />} title="Full explanation" desc={getModeDesc("full")} modeKey="full" />
            <ModeCard active={mode === "socratic"} locked={isModeLocked("socratic")} onClick={() => { if (isModeLocked("socratic")) { setUpgradeReason("LIMIT_TRIAL"); return; } setMode("socratic"); }} icon={<HelpCircle className="h-5 w-5" />} title="Socratic" desc={getModeDesc("socratic")} modeKey="socratic" />
            <ModeCard active={mode === "multi"} locked={isModeLocked("multi")} onClick={() => { if (isModeLocked("multi")) { setUpgradeReason("LIMIT_TRIAL"); return; } setMode("multi"); }} icon={<Sigma className="h-5 w-5" />} title="Multi-method" desc={getModeDesc("multi")} modeKey="multi" />
          </div>
        </div>

        {mode !== "socratic" && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium">Explain like I'm...</label>
              {plan !== "pro" && <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" />Pro only</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => {
                const locked = plan !== "pro" && l.key !== "high"
                return (
                  <button key={l.key} onClick={() => { if (locked) { setUpgradeReason("LIMIT_LEVEL"); return; } setLevel(l.key); }}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition",
                      level === l.key && !locked ? "border-primary bg-primary/10 text-primary" :
                      locked ? "border-border bg-card text-foreground/40 cursor-not-allowed" :
                      "border-border bg-card text-foreground/70 hover:bg-muted")}>
                    {l.label}{locked && <Lock className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <button disabled={!hasInput || loading} onClick={handleSolve} className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-500 px-6 py-4 text-base font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {loading ? "Solving..." : "Solve it"}
        </button>

        {loading && (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <div className="flex items-center justify-center">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="mt-4 font-serif text-lg text-foreground"><RotatingText /></p>
            <p className="mt-1 text-xs text-muted-foreground">This usually takes 5–10 seconds</p>
          </div>
        )}

        {!loading && result && resultMode && (
          <div className="mt-8 space-y-4">
            {resultMode === "quick" && <QuickView r={result as QuickResult} />}
            {resultMode === "full" && <FullView r={result as FullResult} />}
            {resultMode === "multi" && <MultiView r={result as MultiResult} />}
            {resultMode === "socratic" && <SocraticView r={result as SocraticResult} subject={subject} originalProblem={lastContextRef.current?.text || ""} />}

            <div className="flex flex-wrap gap-2">
              <button onClick={speakResult} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"><Volume2 className="h-4 w-4" />Listen</button>
              <button onClick={async () => { const text = formatResultForClipboard(result, resultMode); try { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); } catch { toast.error("Could not copy"); } }} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"><Copy className="h-4 w-4" />Copy</button>
              <button onClick={handleTrySimilar} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"><RefreshCw className="h-4 w-4" />Try similar problem</button>
              {savedId && (
                <button onClick={async () => { try { const { token } = await callShare({ data: { problemId: savedId } }); const url = `${window.location.origin}/s/${token}`; await navigator.clipboard.writeText(url); toast.success("Share link copied to clipboard"); } catch (e: any) { toast.error(e?.message || "Could not create share link"); } }} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"><Share2 className="h-4 w-4" />Share link</button>
              )}
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"><Printer className="h-4 w-4" />Save as PDF</button>
              {plan !== "free" && (
                <button onClick={() => setChatOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"><MessageCircle className="h-4 w-4" />Ask a follow-up</button>
              )}
              {user && savedId && (
                <button onClick={toggleBookmark} className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition", bookmarked ? "border-primary bg-primary/10 text-primary hover:bg-primary/20" : "border-border bg-card hover:bg-muted")}>
                  <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />{bookmarked ? "Bookmarked" : "Bookmark"}
                </button>
              )}
            </div>

            <WeaknessRadar key={savedId ?? "radar"} />

            {chatOpen && plan !== "free" && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {chatHistory.length === 0 && <p className="text-sm text-muted-foreground">Ask anything about this problem — I have the full context.</p>}
                  {chatHistory.map((m, i) => (
                    <div key={i} className={cn("rounded-lg px-3 py-2 text-sm", m.role === "user" ? "ml-8 bg-primary/10 text-foreground" : "mr-8 bg-muted text-foreground")}>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="mr-8 inline-flex gap-1 rounded-lg bg-muted px-3 py-2">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
                    </div>
                  )}
                </div>
                <form onSubmit={sendChat} className="mt-3 flex gap-2">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type your follow-up question..." className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  <button type="submit" disabled={!chatInput.trim() || chatLoading} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Send className="h-4 w-4" />Send</button>
                </form>
              </div>
            )}
          </div>
        )}

        {upgradeReason && <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeReason(null)} />}
      </main>
      <MobileNav />
    </div>
  );
}

const MODE_STYLES = {
  quick: { 
    icon: "ti ti-bolt",
    emoji: "⚡",
    color: "from-amber-400 to-orange-500",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/40 dark:to-orange-950/40 dark:border-amber-800",
    activeBg: "bg-gradient-to-br from-amber-100 to-orange-100 border-amber-400 ring-2 ring-amber-200 dark:from-amber-900/60 dark:to-orange-900/60 dark:border-amber-500",
    iconColor: "text-amber-500",
  },
  full: {
    emoji: "📖",
    color: "from-blue-400 to-indigo-500",
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/40 dark:to-indigo-950/40 dark:border-blue-800",
    activeBg: "bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-400 ring-2 ring-blue-200 dark:from-blue-900/60 dark:to-indigo-900/60 dark:border-blue-500",
    iconColor: "text-blue-500",
  },
  socratic: {
    emoji: "💡",
    color: "from-emerald-400 to-teal-500",
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-950/40 dark:to-teal-950/40 dark:border-emerald-800",
    activeBg: "bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-400 ring-2 ring-emerald-200 dark:from-emerald-900/60 dark:to-teal-900/60 dark:border-emerald-500",
    iconColor: "text-emerald-500",
  },
  multi: {
    emoji: "🔀",
    color: "from-purple-400 to-violet-500",
    bg: "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 dark:from-purple-950/40 dark:to-violet-950/40 dark:border-purple-800",
    activeBg: "bg-gradient-to-br from-purple-100 to-violet-100 border-purple-400 ring-2 ring-purple-200 dark:from-purple-900/60 dark:to-violet-900/60 dark:border-purple-500",
    iconColor: "text-purple-500",
  },
}

function ModeCard({ active, locked, onClick, title, desc, modeKey }: {
  active: boolean; locked: boolean; onClick: () => void;
  title: string; desc: string; modeKey: string
}) {
  const style = MODE_STYLES[modeKey as keyof typeof MODE_STYLES]
  if (!style) return null
  return (
    <button onClick={onClick} className={cn(
      "relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
      locked ? "border-border bg-card opacity-50 cursor-not-allowed" :
      active ? `${style.activeBg} shadow-sm` :
      `${style.bg} hover:shadow-sm hover:scale-[1.02]`
    )}>
      {locked && <Lock className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground" />}
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-xl", 
        active ? "bg-white/60 dark:bg-black/20" : "bg-white/40 dark:bg-black/10")}>
        {style.emoji}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function QuickView({ r }: { r: QuickResult }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700"><Zap className="h-3.5 w-3.5" /> Quick trick</div>
        <p className="text-sm text-amber-950"><MathRenderer text={r.trick} /></p>
      </div>
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Answer</div>
        <p className="font-serif text-lg font-semibold text-emerald-950"><MathRenderer text={r.answer} /></p>
      </div>
      {r.note && <p className="px-1 text-xs text-muted-foreground"><MathRenderer text={r.note} /></p>}
    </div>
  );
}

function DesmosGraph({ expressions }: { expressions: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<any>(null);
  useEffect(() => {
    const init = () => {
      if (!containerRef.current) return;
      if (calcRef.current) calcRef.current.destroy();
      calcRef.current = (window as any).Desmos.GraphingCalculator(containerRef.current, { keypad: false, expressions: false, settingsMenu: false, zoomButtons: true });
      expressions.forEach((expr, i) => { calcRef.current.setExpression({ id: `e${i}`, latex: expr }); });
    };
    if ((window as any).Desmos) { init(); }
    else {
      const existing = document.getElementById("desmos-script");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "desmos-script";
        script.src = "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
        script.async = true; script.onload = init;
        document.head.appendChild(script);
      }
    }
    return () => { if (calcRef.current) calcRef.current.destroy(); };
  }, [expressions.join(",")]);
  return <div ref={containerRef} suppressHydrationWarning style={{ width: "100%", height: "380px" }} className="rounded-xl border border-border overflow-hidden" />;
}

function FullView({ r }: { r: FullResult }) {
  const hasGraph = !!r.graph?.expressions?.length;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Lightbulb className="h-3.5 w-3.5" /> Concept</div>
        <p className="text-sm text-foreground"><MathRenderer text={r.concept} /></p>
      </div>
      <ol className="space-y-3">
        {r.steps.map((s, i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
              <div className="flex-1">
                <h3 className="font-serif text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-foreground/80"><MathRenderer text={s.content} /></p>
                {s.formula && <div className="mt-2 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2"><BlockMath math={s.formula.replace(/^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '').trim()} /></div>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Final answer</div>
        <p className="font-serif text-lg font-semibold text-emerald-950"><MathRenderer text={r.answer} /></p>
      </div>
      {hasGraph && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Graph</div>
          <DesmosGraph expressions={r.graph!.expressions} />
          {r.graph!.note && <p className="px-1 text-xs text-muted-foreground">{r.graph!.note}</p>}
        </div>
      )}
    </div>
  );
}

function MultiView({ r }: { r: MultiResult }) {
  const [activeMethod, setActiveMethod] = useState(0);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Lightbulb className="h-3.5 w-3.5" /> Concept</div>
        <p className="text-sm text-foreground"><MathRenderer text={r.concept} /></p>
      </div>
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto">
        {r.methods.map((m, i) => (
          <button key={i} onClick={() => setActiveMethod(i)} className={cn("flex-shrink-0 rounded-md px-3 py-2 text-sm font-medium transition", activeMethod === i ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted")}>{m.name}</button>
        ))}
      </div>
      {r.methods[activeMethod] && (
        <div className="space-y-3">
          <ol className="space-y-3">
            {r.methods[activeMethod].steps.map((s, i) => (
              <li key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <h3 className="font-serif text-base font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-foreground/80"><MathRenderer text={s.content} /></p>
                    {s.formula && <div className="mt-2 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2"><BlockMath math={s.formula.replace(/^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '').trim()} /></div>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Answer</div>
            <p className="font-serif text-lg font-semibold text-emerald-950"><MathRenderer text={r.methods[activeMethod].answer} /></p>
          </div>
        </div>
      )}
    </div>
  );
}

function SocraticView({ r, subject, originalProblem }: { r: SocraticResult; subject: string; originalProblem: string }) {
  const [studentAnswer, setStudentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const callEval = useServerFn(evaluateSocraticAnswer);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentAnswer.trim() || loading) return;
    const answer = studentAnswer.trim(); setStudentAnswer("");
    const newConversation = [...conversation, { role: "user" as const, content: answer }];
    setConversation(newConversation); setLoading(true);
    try {
      const res = await callEval({ data: { subject, originalProblem, hint: r.hint, question: r.question, studentAnswer: answer, conversationHistory: conversation } });
      setConversation([...newConversation, { role: "assistant", content: res.feedback }]);
    } catch (e: any) { toast.error(e?.message || "Failed to evaluate answer."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700"><Lightbulb className="h-3.5 w-3.5" /> Hint</div>
        <p className="text-sm text-amber-950"><MathRenderer text={r.hint} /></p>
      </div>
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><HelpCircle className="h-3.5 w-3.5" /> Think about this</div>
        <p className="font-serif text-base text-primary"><MathRenderer text={r.question} /></p>
      </div>
      <p className="px-1 text-sm italic text-muted-foreground">{r.encouragement}</p>
      {conversation.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          {conversation.map((m, i) => (
            <div key={i} className={cn("rounded-lg px-3 py-2 text-sm", m.role === "user" ? "ml-8 bg-primary/10 text-foreground" : "mr-8 bg-muted text-foreground")}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {loading && <div className="mr-8 inline-flex gap-1 rounded-lg bg-muted px-3 py-2"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" /></div>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block text-xs font-medium text-foreground/70">{conversation.length === 0 ? "Your answer" : "Continue your answer"}</label>
        <textarea value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} rows={3} placeholder="Try working it out here..." className="w-full rounded-md border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <button type="submit" disabled={!studentAnswer.trim() || loading} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "Evaluating..." : "Check my answer"}
        </button>
      </form>
    </div>
  );
}