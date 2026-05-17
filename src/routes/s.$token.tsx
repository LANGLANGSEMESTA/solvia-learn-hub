import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sigma, Loader2, Lightbulb, CheckCircle2, Zap, HelpCircle, ArrowRight } from "lucide-react";
import { getSharedProblem } from "@/lib/share.functions";

export const Route = createFileRoute("/s/$token")({
  head: () => ({
    meta: [
      { title: "Shared solution — Solvai" },
      { name: "description", content: "A solution shared from Solvai, the AI STEM tutor." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedPage,
});

type QuickResult = { trick: string; answer: string; note?: string };
type FullStep = { title: string; content: string; formula?: string };
type FullResult = { concept: string; steps: FullStep[]; answer: string };
type SocraticResult = { hint: string; question: string; encouragement: string };

function SharedPage() {
  const { token } = useParams({ from: "/s/$token" });
  const fetchShared = useServerFn(getSharedProblem);
  const { data, isLoading, error } = useQuery({
    queryKey: ["shared", token],
    queryFn: () => fetchShared({ data: { token } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sigma className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight">Solvai</span>
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Solvai
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">This shared link is invalid or has been removed.</p>
          </div>
        )}
        {data && (
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">{data.subject}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{data.mode}</span>
              <span>·</span>
              <span>{new Date(data.created_at).toLocaleDateString()}</span>
            </div>
            {data.input_text && (
              <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Problem</div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{data.input_text}</p>
              </div>
            )}
            <div className="mt-6">
              <SharedResult mode={data.mode as string} result={data.result as unknown} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SharedResult({ mode, result }: { mode: string; result: unknown }) {
  if (mode === "quick") {
    const r = result as QuickResult;
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
  if (mode === "full") {
    const r = result as FullResult;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Lightbulb className="h-3.5 w-3.5" /> Concept
          </div>
          <p className="text-sm whitespace-pre-wrap">{r.concept}</p>
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
  if (mode === "socratic") {
    const r = result as SocraticResult;
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
      </div>
    );
  }
  return <pre className="rounded-md bg-muted p-4 text-xs">{JSON.stringify(result, null, 2)}</pre>;
}

