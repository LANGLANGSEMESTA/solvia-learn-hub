import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sigma,
  ArrowRight,
  Camera,
  Keyboard,
  FileText,
  Image as ImageIcon,
  Zap,
  BookOpen,
  HelpCircle,
  Sparkles,
  Upload,
  Volume2,
  RefreshCw,
  MessageCircle,
  Send,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { solveProblem, chatFollowUp } from "@/lib/solve.functions";

export const Route = createFileRoute("/solve")({
  head: () => ({
    meta: [
      { title: "Solve — Solvia" },
      {
        name: "description",
        content:
          "Solve any STEM problem with Solvia. Upload a photo, type your question, scan a PDF, or use your camera.",
      },
    ],
  }),
  component: SolvePage,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sigma className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="font-serif text-xl font-semibold tracking-tight">Solvia</span>
    </Link>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 sm:flex">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted">
            Home
          </Link>
          <Link to="/solve" className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
            Solve
          </Link>
        </nav>
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

type TabKey = "upload" | "type" | "camera";
type Subject = "Math" | "Physics" | "Chemistry";
type Mode = "quick" | "full" | "socratic";

const TABS: { key: TabKey; label: string; icon: typeof Camera }[] = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "type", label: "Type", icon: Keyboard },
  { key: "camera", label: "Camera", icon: Camera },
];

type QuickResult = { trick: string; answer: string; note?: string };
type FullStep = { title: string; content: string; formula?: string };
type FullResult = { concept: string; steps: FullStep[]; answer: string };
type SocraticResult = { hint: string; question: string; encouragement: string };
type AnyResult = QuickResult | FullResult | SocraticResult;

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

function dataUrlToBase64(dataUrl: string) {
  const [meta, data] = dataUrl.split(",");
  const mediaType = /data:(.*?);base64/.exec(meta)?.[1] || "image/png";
  return { base64: data, mediaType };
}

function SolvePage() {
  const [tab, setTab] = useState<TabKey>("upload");
  const [photo, setPhoto] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [captured, setCaptured] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject>("Math");
  const [mode, setMode] = useState<Mode>("full");

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnyResult | null>(null);
  const [resultMode, setResultMode] = useState<Mode | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const lastContextRef = useRef<{
    text?: string;
    imageBase64?: string;
    imageMediaType?: string;
    pdfBase64?: string;
    subject: string;
  } | null>(null);

  const callSolve = useServerFn(solveProblem);
  const callChat = useServerFn(chatFollowUp);

  const hasInput =
    (tab === "upload" && (!!photo || !!pdf)) ||
    (tab === "type" && text.trim().length > 0) ||
    (tab === "camera" && !!captured);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (e) {
      console.error(e);
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }
  function capture() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setCaptured(c.toDataURL("image/png"));
    stopCamera();
  }

  async function buildPayload() {
    const payload: any = { mode, subject };
    if (tab === "type") payload.text = text.trim();
    else if (tab === "photo" && photo) {
      const { base64, mediaType } = await fileToBase64(photo);
      payload.imageBase64 = base64;
      payload.imageMediaType = mediaType;
    } else if (tab === "camera" && captured) {
      const { base64, mediaType } = dataUrlToBase64(captured);
      payload.imageBase64 = base64;
      payload.imageMediaType = mediaType;
    } else if (tab === "pdf" && pdf) {
      const { base64 } = await fileToBase64(pdf);
      payload.pdfBase64 = base64;
    }
    return payload;
  }

  async function handleSolve() {
    if (!hasInput || loading) return;
    setLoading(true);
    setResult(null);
    setChatOpen(false);
    setChatHistory([]);
    try {
      const payload = await buildPayload();
      lastContextRef.current = {
        text: payload.text,
        imageBase64: payload.imageBase64,
        imageMediaType: payload.imageMediaType,
        pdfBase64: payload.pdfBase64,
        subject,
      };
      const res = await callSolve({ data: payload });
      setResult(res.result as AnyResult);
      setResultMode(mode);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTrySimilar() {
    if (!lastContextRef.current || loading) return;
    setLoading(true);
    try {
      const ctx = lastContextRef.current;
      // Ask for a similar problem then solve with same mode
      const similarPrompt = `Generate a different but similar ${ctx.subject} problem to the previous one and solve it using the same format.`;
      const res = await callSolve({
        data: {
          mode: resultMode || mode,
          subject: ctx.subject,
          text: similarPrompt + (ctx.text ? `\n\nPrevious problem: ${ctx.text}` : ""),
          imageBase64: ctx.imageBase64,
          imageMediaType: ctx.imageMediaType,
          pdfBase64: ctx.pdfBase64,
        } as any,
      });
      setResult(res.result as AnyResult);
      setChatOpen(false);
      setChatHistory([]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate similar problem.");
    } finally {
      setLoading(false);
    }
  }

  function speakResult() {
    if (!result) return;
    let text = "";
    if (resultMode === "quick") {
      const r = result as QuickResult;
      text = `${r.trick}. Answer: ${r.answer}. ${r.note || ""}`;
    } else if (resultMode === "full") {
      const r = result as FullResult;
      text =
        `${r.concept}. ` +
        r.steps.map((s, i) => `Step ${i + 1}: ${s.title}. ${s.content}`).join(" ") +
        ` Final answer: ${r.answer}.`;
    } else if (resultMode === "socratic") {
      const r = result as SocraticResult;
      text = `${r.hint}. ${r.question}. ${r.encouragement}`;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    } catch {
      toast.error("Speech synthesis not supported in this browser.");
    }
  }

  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading || !lastContextRef.current) return;
    const message = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user" as const, content: message }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const ctx = lastContextRef.current;
      const res = await callChat({
        data: {
          mode: resultMode || mode,
          subject: ctx.subject,
          originalText: ctx.text,
          imageBase64: ctx.imageBase64,
          imageMediaType: ctx.imageMediaType,
          pdfBase64: ctx.pdfBase64,
          history: chatHistory,
          message,
        } as any,
      });
      setChatHistory([...newHistory, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message.");
      setChatHistory(chatHistory);
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-[680px] px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Solve a problem
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Upload, type, or snap your STEM question.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-8 grid grid-cols-4 gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {tab === "photo" && (
            <div
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && f.type.startsWith("image/")) setPhoto(f);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-10 text-center transition hover:border-primary/50 hover:bg-muted/40"
            >
              <Camera className="h-10 w-10 text-primary" strokeWidth={1.5} />
              <p className="mt-4 text-sm font-medium">
                {photo ? photo.name : "Drop your problem here or click to upload"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {tab === "type" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Type your math, physics, or chemistry problem here... e.g. Find the derivative of sin(3x)"
              className="w-full rounded-xl border border-border bg-card p-4 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          )}

          {tab === "pdf" && (
            <div
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && f.type === "application/pdf") setPdf(f);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-10 text-center transition hover:border-primary/50 hover:bg-muted/40"
            >
              <Upload className="h-10 w-10 text-primary" strokeWidth={1.5} />
              <p className="mt-4 text-sm font-medium">
                {pdf ? pdf.name : "Upload a PDF with your problem"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PDF up to 10MB</p>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {tab === "camera" && (
            <div className="rounded-xl border border-border bg-card p-4">
              {captured ? (
                <div className="space-y-3">
                  <img src={captured} alt="Captured problem" className="w-full rounded-lg border border-border" />
                  <button
                    onClick={() => {
                      setCaptured(null);
                      startCamera();
                    }}
                    className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Retake
                  </button>
                </div>
              ) : cameraOn ? (
                <div className="space-y-3">
                  <video ref={videoRef} className="w-full rounded-lg border border-border bg-black" playsInline muted />
                  <div className="flex gap-2">
                    <button
                      onClick={capture}
                      className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Capture
                    </button>
                    <button onClick={stopCamera} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Camera className="h-10 w-10 text-primary" strokeWidth={1.5} />
                  <p className="mt-4 text-sm font-medium">Use your webcam to scan a problem</p>
                  <button
                    onClick={startCamera}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Camera className="h-4 w-4" />
                    Activate camera
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium">Subject</label>
            <span className="text-xs text-muted-foreground">Auto-detected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["Math", "Physics", "Chemistry"] as Subject[]).map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                  subject === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground/70 hover:bg-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div className="mt-8">
          <label className="mb-3 block text-sm font-medium">Mode</label>
          <div className="grid gap-3 sm:grid-cols-3">
            <ModeCard active={mode === "quick"} onClick={() => setMode("quick")} icon={<Zap className="h-5 w-5" />} title="Quick trick" desc="Fast answer + shortcut" />
            <ModeCard active={mode === "full"} onClick={() => setMode("full")} icon={<BookOpen className="h-5 w-5" />} title="Full explanation" desc="Step by step" />
            <ModeCard active={mode === "socratic"} onClick={() => setMode("socratic")} icon={<HelpCircle className="h-5 w-5" />} title="Socratic" desc="Guided hints" />
          </div>
        </div>

        {/* Solve button */}
        <button
          disabled={!hasInput || loading}
          onClick={handleSolve}
          className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-5 w-5" />
          {loading ? "Solving..." : "Solve it"}
        </button>

        {/* Loading state */}
        {loading && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" />
            </div>
            <p className="mt-4 font-serif text-base text-foreground/80">Your AI tutor is thinking...</p>
          </div>
        )}

        {/* Result */}
        {!loading && result && resultMode && (
          <div className="mt-8 space-y-4">
            {resultMode === "quick" && <QuickView r={result as QuickResult} />}
            {resultMode === "full" && <FullView r={result as FullResult} />}
            {resultMode === "socratic" && <SocraticView r={result as SocraticResult} />}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={speakResult}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <Volume2 className="h-4 w-4" />
                Listen
              </button>
              <button
                onClick={handleTrySimilar}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
                Try similar problem
              </button>
              <button
                onClick={() => setChatOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <MessageCircle className="h-4 w-4" />
                Ask a follow-up
              </button>
            </div>

            {chatOpen && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {chatHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ask anything about this problem — I have the full context.
                    </p>
                  )}
                  {chatHistory.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        m.role === "user"
                          ? "ml-8 bg-primary/10 text-foreground"
                          : "mr-8 bg-muted text-foreground",
                      )}
                    >
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
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your follow-up question..."
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition",
        active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span className={cn("text-primary", active ? "text-primary" : "text-foreground/70")}>{icon}</span>
      <span className="font-serif text-base font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}

function QuickView({ r }: { r: QuickResult }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
          <Zap className="h-3.5 w-3.5" /> Quick trick
        </div>
        <p className="text-sm text-amber-950 whitespace-pre-wrap">{r.trick}</p>
      </div>
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Answer
        </div>
        <p className="font-serif text-lg font-semibold text-emerald-950 whitespace-pre-wrap">{r.answer}</p>
      </div>
      {r.note && <p className="px-1 text-xs text-muted-foreground">{r.note}</p>}
    </div>
  );
}

function FullView({ r }: { r: FullResult }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Lightbulb className="h-3.5 w-3.5" /> Concept
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{r.concept}</p>
      </div>
      <ol className="space-y-3">
        {r.steps.map((s, i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div className="flex-1">
                <h3 className="font-serif text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap">{s.content}</p>
                {s.formula && (
                  <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono">
                    {s.formula}
                  </pre>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Final answer
        </div>
        <p className="font-serif text-lg font-semibold text-emerald-950 whitespace-pre-wrap">{r.answer}</p>
      </div>
    </div>
  );
}

function SocraticView({ r }: { r: SocraticResult }) {
  const [studentAnswer, setStudentAnswer] = useState("");
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
          <Lightbulb className="h-3.5 w-3.5" /> Hint
        </div>
        <p className="text-sm text-amber-950 whitespace-pre-wrap">{r.hint}</p>
      </div>
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <HelpCircle className="h-3.5 w-3.5" /> Think about this
        </div>
        <p className="font-serif text-base text-primary whitespace-pre-wrap">{r.question}</p>
      </div>
      <p className="px-1 text-sm italic text-muted-foreground">{r.encouragement}</p>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground/70">Your answer</label>
        <textarea
          value={studentAnswer}
          onChange={(e) => setStudentAnswer(e.target.value)}
          rows={3}
          placeholder="Try working it out here..."
          className="w-full rounded-md border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
}
