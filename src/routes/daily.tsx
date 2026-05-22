import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Star, CheckCircle2, XCircle } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { useAuth } from "@/hooks/use-auth";
import { getDailyChallenge, submitDailyChallenge } from "@/lib/solve.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/daily")({
  head: () => ({ meta: [{ title: "Daily Challenge — Solvai" }] }),
  component: DailyPage,
});

type Challenge = {
  id: string
  date: string
  topic: string
  question: string
  hint: string
  answer: string
  explanation: string
}

function DailyPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const callGetChallenge = useServerFn(getDailyChallenge)
  const callSubmit = useServerFn(submitDailyChallenge)

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [userAnswer, setUserAnswer] = useState("")
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" })
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) return
    callGetChallenge({ data: undefined }).then(res => {
      setChallenge(res.challenge)
      setLoading(false)
    }).catch(e => {
      toast.error(e?.message || "Failed to load daily challenge.")
      setLoading(false)
    })
  }, [user])

  async function handleAnswer(correct: boolean) {
    if (submitted) return
    setSubmitted(true)
    setResult(correct ? "correct" : "incorrect")
    try {
      const res = await callSubmit({ data: { correct } })
      if (res.alreadySubmitted) setAlreadyDone(true)
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit.")
    }
  }

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/solve" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            <span className="font-serif text-lg font-semibold">Daily Challenge</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[600px] px-4 py-8 sm:px-6">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">{today}</p>
          <p className="text-xs text-muted-foreground mt-1">One problem per day · Free for everyone</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading today's challenge...</p>
          </div>
        )}

        {!loading && challenge && (
          <div className="space-y-4">
            {/* Topic badge */}
            <div className="flex justify-center">
              <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold capitalize">
                {challenge.topic}
              </span>
            </div>

            {/* Question */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">Today's Question</p>
              <p className="text-base font-medium text-amber-950"><MathRenderer text={challenge.question} /></p>
            </div>

            {/* Hint */}
            {!showHint && !showAnswer && (
              <button onClick={() => setShowHint(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                Show hint
              </button>
            )}
            {showHint && !showAnswer && (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Hint</p>
                <p className="text-sm"><MathRenderer text={challenge.hint} /></p>
              </div>
            )}

            {/* Answer input */}
            {!showAnswer && !alreadyDone && (
              <div className="space-y-3">
                <textarea
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  rows={3}
                  placeholder="Write your answer here..."
                  className="w-full rounded-xl border border-border bg-card p-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => setShowAnswer(true)}
                  disabled={!userAnswer.trim()}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  Check Answer
                </button>
              </div>
            )}

            {/* Already done today */}
            {alreadyDone && !showAnswer && (
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                <p className="text-sm text-muted-foreground">You already completed today's challenge. Come back tomorrow!</p>
                <button onClick={() => setShowAnswer(true)} className="mt-2 text-xs text-primary underline underline-offset-2">
                  See answer
                </button>
              </div>
            )}

            {/* Correct answer reveal */}
            {showAnswer && (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Correct Answer</p>
                  <p className="text-base font-semibold text-emerald-950"><MathRenderer text={challenge.answer} /></p>
                  <p className="mt-2 text-sm text-emerald-800"><MathRenderer text={challenge.explanation} /></p>
                </div>

                {/* Self-evaluate — only if not already submitted */}
                {!submitted && !alreadyDone && (
                  <>
                    <p className="text-sm text-center text-muted-foreground">Did you get it right?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleAnswer(false)}
                        className="flex-1 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100">
                        <XCircle className="h-4 w-4 inline mr-1" />Not quite
                      </button>
                      <button onClick={() => handleAnswer(true)}
                        className="flex-1 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="h-4 w-4 inline mr-1" />Got it!
                      </button>
                    </div>
                  </>
                )}

                {/* Result */}
                {result && (
                  <div className={cn("rounded-xl border p-4 text-center", result === "correct" ? "border-emerald-300 bg-emerald-50" : "border-red-200 bg-red-50")}>
                    <p className="font-semibold text-sm">
                      {result === "correct" ? "🎉 Nice work! See you tomorrow." : "💪 Keep practicing! Come back tomorrow."}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link to="/solve" className="flex-1 inline-flex items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted">
                    Solve more problems
                  </Link>
                  <Link to="/practice" className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                    Practice mode
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}