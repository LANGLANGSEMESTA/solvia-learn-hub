import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "deepseek-v4-flash";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1";

type Mode = "quick" | "full" | "socratic" | "multi";
type Level = "kid" | "middle" | "high" | "university" | "expert";
type Plan = "free" | "basic" | "pro";

const LANGUAGE_RULE =
  "IMPORTANT: Detect the language of the user's problem and respond in the SAME language. If the problem is in Indonesian, respond in Indonesian. If in English, respond in English. If in pure math notation, respond in English.";

const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  kid: "Explain like I'm 10 years old. Use very simple words, fun analogies, and avoid jargon.",
  middle: "Explain like I'm a middle school student (age 12-14). Use simple language and relatable examples.",
  high: "Explain like I'm a high school student. Use standard curriculum language and formulas.",
  university: "Explain like I'm a university student. Use precise mathematical language and full derivations.",
  expert: "Explain at expert level. Be concise, use advanced notation, assume deep domain knowledge.",
};

const LATEX_RULES = `
LATEX RULES - STRICT:
1. ALL mathematical expressions MUST be wrapped with $...$ (inline) or $$...$$ (display)
2. NEVER write bare LaTeX like \\sin(x) without $ signs
3. Variables like f'(x) also need $...$ wrapping
4. For the "formula" field: wrap entire expression in $$...$$
5. NEVER use \\text{cdot} - use \\cdot directly
6. In "formula" field: use ONLY pure LaTeX math, no \Rightarrow chains with text mixed in. Keep formulas as single clean math expressions.
CORRECT: "Compute $u' = 2x$ and $v' = \\cos(x)$"
CORRECT: "$2x \\cdot \\sin(x)$" not "$2x \\text{cdot} \\sin(x)$"
CORRECT formula field: "$$f'(x) = 2x\\sin(x) + x^2\\cos(x)$$"
WRONG: "Compute u' = 2x and v' = \\cos(x)"
`;

const SYSTEM_PROMPTS: Record<Mode, string> = {
  quick:
    `You are a STEM tutor. Give a fast trick or shortcut to solve this problem. Be concise. ${LANGUAGE_RULE} ${LATEX_RULES} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"trick": string, "answer": string, "note"?: string}`,
  full:
    `You are a STEM teacher. Explain step by step like in school curriculum. ${LANGUAGE_RULE} ${LATEX_RULES} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"concept": string, "steps": [{"title": string, "content": string, "formula"?: string}], "answer": string, "graph"?: {"expressions": string[], "note"?: string}}. CRITICAL: If the problem involves any plottable function (parabola, line, circle, trigonometric, exponential), you MUST include the "graph" field with Desmos-compatible expression strings. Example: for y=x^2-4 and y=x+2, return "graph": {"expressions": ["y=x^2-4", "y=x+2"]}. Use simple Desmos syntax without LaTeX backslashes.`,
  socratic:
    `You are a Socratic tutor. Do NOT give the answer. Guide the student with questions and hints only. ${LANGUAGE_RULE} ${LATEX_RULES} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"hint": string, "question": string, "encouragement": string}`,
  multi:
    `You are a STEM teacher. Show 2-3 different methods to solve this problem. ${LANGUAGE_RULE} ${LATEX_RULES} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"concept": string, "methods": [{"name": string, "steps": [{"title": string, "content": string, "formula"?: string}], "answer": string}]}. Each method must have a distinct name like "Factoring", "Quadratic Formula", "Completing the Square", "Graphical", etc.`,
};

export const SOCRATIC_EVAL_PROMPT = `You are a Socratic tutor evaluating a student's answer attempt.
You have the original problem, the hint and guiding question you gave, and now the student's answer.
IMPORTANT: Detect the language of the student's answer and respond in the SAME language.
Do NOT give the final answer directly unless the student is very close or has already gotten it right.
Instead: evaluate their attempt, point out what's right, correct misconceptions gently, and ask a follow-up guiding question if they're not there yet.
If they got it right, congratulate them and confirm the answer.
Respond in plain text (no JSON).`;

type SolveInput = {
  mode: Mode;
  level?: Level;
  subject: string;
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
  pdfBase64?: string;
};

// ─── Plan limits ────────────────────────────────────────────────
const PLAN_LIMITS: Record<Plan, Record<Mode, number>> = {
  free:  { quick: 10, full: 1, socratic: 1, multi: 1 },
  basic: { quick: 999, full: 999, socratic: 1, multi: 1 },
  pro:   { quick: 999, full: 999, socratic: 999, multi: 999 },
}

const PLAN_SUBJECTS: Record<Plan, string[]> = {
  free:  ["Math"],
  basic: ["Math", "Physics", "Chemistry"],
  pro:   ["Math", "Physics", "Chemistry"],
}

function getPlan(subscription: any): Plan {
  if (!subscription?.is_premium) return "free"
  if (!subscription?.premium_until) return "free"
  if (new Date(subscription.premium_until) <= new Date()) return "free"
  return (subscription?.plan as Plan) ?? "basic"
}

// ─── OCR ────────────────────────────────────────────────────────
async function extractTextFromImage(imageBase64: string, mediaType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Extract and transcribe all text and mathematical expressions from this image exactly as written. Include all numbers, symbols, equations, and text. Output only the extracted content, nothing else." },
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
          ],
        }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini OCR error [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function extractTextFromPdf(pdfBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Extract and transcribe all text and mathematical expressions from this PDF exactly as written. Include all numbers, symbols, equations, and text. Output only the extracted content, nothing else." },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
          ],
        }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini PDF OCR error [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callDeepSeek(system: string, userContent: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API error [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function buildUserContent(input: SolveInput & { extractedText?: string }, prefix: string): string {
  const parts: string[] = [prefix, `Subject: ${input.subject}`];
  if (input.level) parts.push(`Explanation level: ${LEVEL_DESCRIPTIONS[input.level]}`);
  if (input.extractedText) parts.push(`Problem (extracted from image/PDF): ${input.extractedText}`);
  else if (input.text) parts.push(`Problem: ${input.text}`);
  else parts.push("Note: No problem text provided.");
  return parts.join("\n");
}

function extractJson(text: string): any {
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  const arrStart = cleaned.indexOf("["); const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)); } catch {}
  }
  throw new Error("Failed to parse AI response as JSON");
}

// ─── solveProblem ────────────────────────────────────────────────
export const solveProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SolveInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("is_premium, premium_until, plan")
      .eq("user_id", user!.id)
      .maybeSingle();

    const plan = getPlan(subscription);

    // Subject gate
    if (!PLAN_SUBJECTS[plan].includes(data.subject)) {
      throw new Error(`LIMIT_SUBJECT:${plan}`);
    }

    // Level gate — only pro can choose level
    if (plan !== "pro" && data.level && data.level !== "high") {
      throw new Error("LIMIT_LEVEL");
    }

    // Mode usage count
    const { count: modeCount } = await supabase
      .from("problems")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("mode", data.mode)
      .gte("created_at", startOfDay.toISOString());

    const limit = PLAN_LIMITS[plan][data.mode];
    if ((modeCount ?? 0) >= limit) {
      throw new Error(`LIMIT_MODE:${data.mode}:${plan}`);
    }

    // OCR
    let extractedText: string | undefined;
    if (data.imageBase64 && data.imageMediaType) {
      extractedText = await extractTextFromImage(data.imageBase64, data.imageMediaType);
    } else if (data.pdfBase64) {
      extractedText = await extractTextFromPdf(data.pdfBase64);
    }

    const system = SYSTEM_PROMPTS[data.mode];
    const userContent = buildUserContent({ ...data, extractedText }, "Solve this STEM problem.");
    const text = await callDeepSeek(system, userContent);
    return { result: extractJson(text), raw: text };
  });

// ─── chatFollowUp ────────────────────────────────────────────────
type FollowUpInput = {
  mode: Mode;
  subject: string;
  originalText?: string;
  imageBase64?: string;
  imageMediaType?: string;
  pdfBase64?: string;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
};

export const chatFollowUp = createServerFn({ method: "POST" })
  .inputValidator((d: FollowUpInput) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

    const system = `You are a helpful STEM tutor continuing a conversation about a ${data.subject} problem. ${LANGUAGE_RULE} Be clear and concise. Use plain text (no JSON).`;
    const messages: any[] = [
      { role: "system", content: system },
      { role: "user", content: `Original problem (${data.subject}):\n${data.originalText || "See previous context."}` },
    ];
    for (const m of data.history) messages.push({ role: m.role, content: m.content });
    messages.push({ role: "user", content: data.message });

    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 8192, messages }),
    });
    if (!res.ok) throw new Error(`DeepSeek API error [${res.status}]: ${await res.text()}`);
    const json = await res.json();
    return { reply: json.choices?.[0]?.message?.content ?? "" };
  });

// ─── evaluateSocraticAnswer ──────────────────────────────────────
type SocraticEvalInput = {
  subject: string;
  originalProblem: string;
  hint: string;
  question: string;
  studentAnswer: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
};

export const evaluateSocraticAnswer = createServerFn({ method: "POST" })
  .inputValidator((d: SocraticEvalInput) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

    const messages: any[] = [
      { role: "system", content: SOCRATIC_EVAL_PROMPT },
      { role: "user", content: `Subject: ${data.subject}\n\nOriginal problem: ${data.originalProblem}\n\nHint I gave: ${data.hint}\n\nGuiding question I asked: ${data.question}` },
    ];
    for (const m of data.conversationHistory) messages.push({ role: m.role, content: m.content });
    messages.push({ role: "user", content: `My answer attempt: ${data.studentAnswer}` });

    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages }),
    });
    if (!res.ok) throw new Error(`DeepSeek API error [${res.status}]: ${await res.text()}`);
    const json = await res.json();
    return { feedback: json.choices?.[0]?.message?.content ?? "" };
  });

// ─── getDailyUsage ───────────────────────────────────────────────
export const getDailyUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("is_premium, premium_until, plan")
      .eq("user_id", user!.id)
      .maybeSingle();

    const plan = getPlan(subscription);

    const modes = ["quick", "full", "socratic", "multi"] as const;
    const counts: Record<string, number> = {};
    for (const mode of modes) {
      const { count } = await supabase
        .from("problems")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("mode", mode)
        .gte("created_at", startOfDay.toISOString());
      counts[mode] = count ?? 0;
    }

    return {
      plan,
      counts,
      limits: PLAN_LIMITS[plan],
      allowedSubjects: PLAN_SUBJECTS[plan],
    };
  });

// ─── Weakness Tracker ────────────────────────────────────────────
export function detectTopic(problem: string): string {
  const p = problem.toLowerCase();
  if (/sin|cos|tan|angle|radian|trigon|sudut/.test(p)) return "trigonometry";
  if (/integral|derivative|limit|calculus|turunan|diferensial/.test(p)) return "calculus";
  if (/statistic|mean|median|mode|deviation|probability|statistik|peluang/.test(p)) return "statistics";
  if (/area|volume|circle|triangle|geometry|pythagoras|luas|lingkaran|segitiga/.test(p)) return "geometry";
  if (/x\^2|quadratic|parabola|factor|root|discriminant|kuadrat|akar/.test(p)) return "algebra";
  if (/percent|ratio|fraction|decimal|proportion|persen|pecahan/.test(p)) return "arithmetic";
  return "algebra";
}

export function updateWeaknessTracker(topic: string) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem("weakness_tracker");
  const tracker = raw ? JSON.parse(raw) : {
    trigonometry: { attempts: 0 },
    calculus:     { attempts: 0 },
    statistics:   { attempts: 0 },
    geometry:     { attempts: 0 },
    algebra:      { attempts: 0 },
    arithmetic:   { attempts: 0 },
  };
  if (!tracker[topic]) tracker[topic] = { attempts: 0 };
  tracker[topic].attempts += 1;
  localStorage.setItem("weakness_tracker", JSON.stringify(tracker));
}

export function getWeaknessData() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("weakness_tracker");
  if (!raw) return null;
  const tracker = JSON.parse(raw);
  return Object.entries(tracker).map(([topic, data]: [string, any]) => ({
    topic,
    attempts: data.attempts,
  }));
}
// ─── Practice Questions ──────────────────────────────────────────
type PracticeInput = { topic: string; count?: number }

export const generatePracticeQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PracticeInput) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured")

    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Generate ${data.count ?? 5} practice questions for ${data.topic}.
Return ONLY valid JSON array, no markdown, no code fences:
[{"question": "...", "hint": "...", "answer": "...", "explanation": "..."}]
- Questions should be clear and concise
- Hints should guide without giving away the answer
- Answers should be specific (numbers, expressions, or short phrases)
- Explanations should be 1-2 sentences`,
        }],
      }),
    })

    if (!res.ok) throw new Error(`DeepSeek error: ${await res.text()}`)
    const json = await res.json()
    const text = json.choices?.[0]?.message?.content ?? "[]"
    try {
      const cleaned = text.replace(/```json|```/g, "").trim()
      return { questions: JSON.parse(cleaned) }
    } catch {
      return { questions: [] }
    }
  })