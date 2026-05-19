import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DAILY_LIMIT = 10;
const MODEL = "deepseek-v4-flash";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1";

type Mode = "quick" | "full" | "socratic";
type Level = "kid" | "middle" | "high" | "university" | "expert";

const LANGUAGE_RULE =
  "IMPORTANT: Detect the language of the user's problem and respond in the SAME language. If the problem is in Indonesian, respond in Indonesian. If in English, respond in English. If in pure math notation, respond in English.";

const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  kid: "Explain like I'm 10 years old. Use very simple words, fun analogies, and avoid jargon.",
  middle: "Explain like I'm a middle school student (age 12-14). Use simple language and relatable examples.",
  high: "Explain like I'm a high school student. Use standard curriculum language and formulas.",
  university: "Explain like I'm a university student. Use precise mathematical language and full derivations.",
  expert: "Explain at expert level. Be concise, use advanced notation, assume deep domain knowledge.",
};

const SYSTEM_PROMPTS: Record<Mode, string> = {
  quick:
    `You are a STEM tutor. Give a fast trick or shortcut to solve this problem. Be concise. ${LANGUAGE_RULE} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"trick": string, "answer": string, "note"?: string}`,
  full:
    `You are a STEM teacher. Explain step by step like in school curriculum. ${LANGUAGE_RULE} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"concept": string, "steps": [{"title": string, "content": string, "formula"?: string}], "answer": string}`,
  socratic:
    `You are a Socratic tutor. Do NOT give the answer. Guide the student with questions and hints only. ${LANGUAGE_RULE} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"hint": string, "question": string, "encouragement": string}`,
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

async function extractTextFromImage(imageBase64: string, mediaType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Extract and transcribe all text and mathematical expressions from this image exactly as written. Include all numbers, symbols, equations, and text. Output only the extracted content, nothing else.",
              },
              {
                inline_data: {
                  mime_type: mediaType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini OCR error [${res.status}]: ${errText}`);
  }

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
        contents: [
          {
            parts: [
              {
                text: "Extract and transcribe all text and mathematical expressions from this PDF exactly as written. Include all numbers, symbols, equations, and text. Output only the extracted content, nothing else.",
              },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini PDF OCR error [${res.status}]: ${errText}`);
  }

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
      thinking: { type: "enabled", budget_tokens: 2000 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function buildUserContent(input: SolveInput & { extractedText?: string }, prefix: string): string {
  const parts: string[] = [];
  parts.push(`${prefix}`);
  parts.push(`Subject: ${input.subject}`);
  if (input.level) {
    parts.push(`Explanation level: ${LEVEL_DESCRIPTIONS[input.level]}`);
  }
  if (input.extractedText) {
    parts.push(`Problem (extracted from image/PDF): ${input.extractedText}`);
  } else if (input.text) {
    parts.push(`Problem: ${input.text}`);
  } else {
    parts.push("Note: No problem text provided.");
  }
  return parts.join("\n");
}

function extractJson(text: string): any {
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }

  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
    } catch {}
  }

  throw new Error("Failed to parse AI response as JSON");
}

export const solveProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SolveInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase
      .from("problems")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("created_at", startOfDay.toISOString());

    // Check premium status
const { data: subscription } = await supabase
  .from("subscriptions")
  .select("is_premium, premium_until")
  .eq("user_id", user!.id)
  .single();

const isPremium = subscription?.is_premium && 
  subscription?.premium_until && 
  new Date(subscription.premium_until) > new Date();

if (!isPremium && (count ?? 0) >= DAILY_LIMIT) {
  throw new Error(`Daily limit reached (${DAILY_LIMIT} problems/day). Upgrade to Premium for unlimited access.`);
}

    // OCR: extract text from image or PDF if provided
    const system = SYSTEM_PROMPTS[data.mode];
    let extractedText: string | undefined;
    if (data.imageBase64 && data.imageMediaType) {
      extractedText = await extractTextFromImage(data.imageBase64, data.imageMediaType);
    } else if (data.pdfBase64) {
      extractedText = await extractTextFromPdf(data.pdfBase64);
    }
    const userContent = buildUserContent({ ...data, extractedText }, "Solve this STEM problem.");
    const text = await callDeepSeek(system, userContent);
    return { result: extractJson(text), raw: text };
  });

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
      {
        role: "user",
        content: `Original problem (${data.subject}):\n${data.originalText || "See previous context."}`,
      },
    ];

    for (const m of data.history) {
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: data.message });

    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 8192, messages }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API error [${res.status}]: ${errText}`);
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    return { reply: text };
  });

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
      {
        role: "user",
        content: `Subject: ${data.subject}\n\nOriginal problem: ${data.originalProblem}\n\nHint I gave: ${data.hint}\n\nGuiding question I asked: ${data.question}`,
      },
    ];

    for (const m of data.conversationHistory) {
      messages.push({ role: m.role, content: m.content });
    }

    messages.push({
      role: "user",
      content: `My answer attempt: ${data.studentAnswer}`,
    });

    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages,
        thinking: { type: "enabled", budget_tokens: 500 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API error [${res.status}]: ${errText}`);
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    return { feedback: text };
  });
  export const getDailyUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data: { user } } = await supabase.auth.getUser();

    const { count } = await supabase
      .from("problems")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("created_at", startOfDay.toISOString());

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("is_premium, premium_until")
      .eq("user_id", user!.id)
      .single();

    const isPremium = subscription?.is_premium &&
      subscription?.premium_until &&
      new Date(subscription.premium_until) > new Date();

    return {
      used: count ?? 0,
      limit: DAILY_LIMIT,
      isPremium: !!isPremium,
    };
  });