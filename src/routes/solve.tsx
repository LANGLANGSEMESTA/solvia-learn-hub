import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/solve")({
  head: () => ({
    meta: [
      { title: "Solve — Solvia" },
      {
        name: "description",
        content:
          "Solve any STEM problem with Solvia. Upload a photo, type your question, scan a PDF, or use your camera.",
      },
      { property: "og:title", content: "Solve — Solvia" },
      {
        property: "og:description",
        content: "AI-powered Math, Physics, and Chemistry solver.",
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
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted"
          >
            Home
          </Link>
          <Link
            to="/solve"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            activeProps={{ className: "bg-muted" }}
          >
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

type TabKey = "photo" | "type" | "pdf" | "camera";
type Subject = "Math" | "Physics" | "Chemistry";
type Mode = "quick" | "full" | "socratic";

const TABS: { key: TabKey; label: string; icon: typeof Camera }[] = [
  { key: "photo", label: "Photo", icon: ImageIcon },
  { key: "type", label: "Type", icon: Keyboard },
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "camera", label: "Camera", icon: Camera },
];

function SolvePage() {
  const [tab, setTab] = useState<TabKey>("photo");
  const [photo, setPhoto] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [captured, setCaptured] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject>("Math");
  const [mode, setMode] = useState<Mode>("full");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const hasInput =
    (tab === "photo" && !!photo) ||
    (tab === "type" && text.trim().length > 0) ||
    (tab === "pdf" && !!pdf) ||
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
                  <img
                    src={captured}
                    alt="Captured problem"
                    className="w-full rounded-lg border border-border"
                  />
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
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg border border-border bg-black"
                    playsInline
                    muted
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={capture}
                      className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
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
            <ModeCard
              active={mode === "quick"}
              onClick={() => setMode("quick")}
              icon={<Zap className="h-5 w-5" />}
              title="Quick trick"
              desc="Fast answer + shortcut"
            />
            <ModeCard
              active={mode === "full"}
              onClick={() => setMode("full")}
              icon={<BookOpen className="h-5 w-5" />}
              title="Full explanation"
              desc="Step by step"
            />
            <ModeCard
              active={mode === "socratic"}
              onClick={() => setMode("socratic")}
              icon={<HelpCircle className="h-5 w-5" />}
              title="Socratic"
              desc="Guided hints"
            />
          </div>
        </div>

        {/* Solve button */}
        <button
          disabled={!hasInput}
          className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-5 w-5" />
          Solve it
        </button>
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
        active
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span className={cn("text-primary", active ? "text-primary" : "text-foreground/70")}>
        {icon}
      </span>
      <span className="font-serif text-base font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}
