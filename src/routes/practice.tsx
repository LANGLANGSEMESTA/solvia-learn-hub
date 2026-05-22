import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Brain, ChevronRight, RotateCcw, Trophy } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { useAuth } from "@/hooks/use-auth";
import { getDailyUsage, getWeaknessData, generatePracticeQuestions } from "@/lib/solve.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice")({
  head: () => ({ meta: [{ title: "Practice — Solvai" }] }),
  component: PracticePage,
});

const TOPICS = [
  { key: "algebra", label: "Algebra" },
  { key: "calculus", label: "Calculus" },
  { key: "statistics", label: "Statistics" },
  { key: "geometry", label: "Geometry" },
  { key: "trigonometry", label: "Trigonometry" },
  { key: "arithmetic", label: "Arithmetic" },
]

type Question = { question: string; hint: string; answer: string; explanation: string }
type SessionResult = { question: Question; userAnswer: string; correct: boolean }

function PracticePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const callGetDailyUsage = useServerFn(getDailyUsage)
  const callGenerateQuestions = useServerFn(generatePracticeQuestions)

  const [plan, setPlan] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<SessionResult[]>([])
  const [phase, setPhase] = useState<"select" | "loading" | "quiz" | "done">("select")

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" })
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (user) {
      callGetDailyUsage({ data: undefined }).then(u => {
        setPlan((u as any).plan ?? "free")
      }).catch(console.error)
    }
  }, [user])

  useEffect(() => {
    const data = getWeaknessData()
    if (data && data.length > 0) {
      const weakest = data.reduce((a, b) => a.attempts < b.attempts ? a : b)
      setSelectedTopic(weakest.attempts === 0 ? "algebra" : weakest.topic)
    } else {
      setSelectedTopic("algebra")
    }
  }, [])

  async function startPractice() {
    if (!selectedTopic) return
    setPhase("loading")
    setResults([])
    setCurrentIdx(0)
    setUserAnswer("")
    setShowHint(false)
    setShowAnswer(false)
    try {
      const res = await callGenerateQuestions({ data: { topic: selectedTopic, count: 5 } })
      console.log("Practice questions response:", JSON.stringify(res))
      if (!res.questions || res.questions.length === 0) {
        toast.error("Failed to generate questions. Try again.")
        setPhase("select")
        return
      }
      setQuestions(res.questions)
      setPhase("quiz")
    } catch (e: any) {
      console.error("Practice error:", e)
      toast.error(e?.message || "Failed to generate questions.")
      setPhase("select")
    }
  }

  function handleAnswer(correct: boolean) {
    const current = questions[currentIdx]
    setResults(prev => [...prev, { question: current, userAnswer, correct }])
    if (currentIdx + 1 >= questions.length) {
      setPhase("done")
    } else {
      setCurrentIdx(i => i + 1)
      setUserAnswer("")
      setShowHint(false)
      setShowAnswer(false)
    }
  }

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  if (plan !== null && plan !== "pro") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-serif text-2xl font-semibold">Practice Mode</h1>
          <p className="text-sm text-muted-foreground">Personalized practice based on your Weakness Radar. Available on Pro plan.</p>
          <Link to="/upgrade" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Upgrade to Pro</Link>
          <Link to="/solve" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted">Back to Solve</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/solve" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg font-semibold">Practice</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[600px] px-4 py-8 sm:px-6">
        {phase === "select" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-semibold">What do you want to practice?</h1>
              <p className="mt-2 text-sm text-muted-foreground">We picked your weakest topic — but you can change it.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TOPICS.map(t => (
                <button key={t.key} onClick={() => setSelectedTopic(t.key)}
                  className={cn("rounded-xl border px-4 py-3 text-sm font-medium transition text-left",
                    selectedTopic === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted")}>
                  {t.label}{selectedTopic === t.key && <span className="ml-1 text-xs">✓</span>}
                </button>
              ))}
            </div>
            <button onClick={startPractice} disabled={!selectedTopic}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <ChevronRight className="h-5 w-5" />Start Practice
            </button>
          </div>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating questions for {TOPICS.find(t => t.key === selectedTopic)?.label}...</p>
          </div>
        )}

        {phase === "quiz" && questions[currentIdx] && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 flex-1">
                {questions.map((_, i) => (
                  <div key={i} className={cn("h-1.5 flex-1 rounded-full transition",
                    i < currentIdx ? "bg-primary" : i === currentIdx ? "bg-primary/50" : "bg-border")} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{currentIdx + 1}/{questions.length}</span>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">Question {currentIdx + 1}</p>
              <p className="text-base font-medium"><MathRenderer text={questions[currentIdx].question} /></p>
            </div>
            {!showHint ? (
              <button onClick={() => setShowHint(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Show hint</button>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Hint</p>
                <p className="text-sm text-amber-900"><MathRenderer text={questions[currentIdx].hint} /></p>
              </div>
            )}
            {!showAnswer && (
              <div className="space-y-3">
                <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} rows={3}
                  placeholder="Write your answer here..."
                  className="w-full rounded-xl border border-border bg-card p-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <button onClick={() => setShowAnswer(true)}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Check Answer
                </button>
              </div>
            )}
            {showAnswer && (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Correct Answer</p>
                  <p className="text-base font-semibold text-emerald-950"><MathRenderer text={questions[currentIdx].answer} /></p>
                  <p className="mt-2 text-sm text-emerald-800"><MathRenderer text={questions[currentIdx].explanation} /></p>
                </div>
                <p className="text-sm text-center text-muted-foreground">Did you get it right?</p>
                <div className="flex gap-2">
                  <button onClick={() => handleAnswer(false)}
                    className="flex-1 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100">✗ Not quite</button>
                  <button onClick={() => handleAnswer(true)}
                    className="flex-1 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">✓ Got it!</button>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-semibold">Session complete!</h2>
              <p className="text-sm text-muted-foreground">{results.filter(r => r.correct).length} / {results.length} correct</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Score</span>
                <span>{Math.round(results.filter(r => r.correct).length / results.length * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${results.filter(r => r.correct).length / results.length * 100}%` }} />
              </div>
            </div>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className={cn("rounded-xl border p-4", r.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{r.correct ? "✓" : "✗"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium"><MathRenderer text={r.question.question} /></p>
                      <p className="text-xs text-muted-foreground mt-1">Answer: <MathRenderer text={r.question.answer} /></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPhase("select"); setResults([]); setCurrentIdx(0); }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted">
                <RotateCcw className="h-4 w-4" />Practice again
              </button>
              <Link to="/solve" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Back to Solve
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}