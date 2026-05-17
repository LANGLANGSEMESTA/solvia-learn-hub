import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DAILY_LIMIT = 5;
const MODEL = "deepseek-v4-flash";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

type Mode = "quick" | "full" | "socratic";

const LANGUAGE_RULE =
  "IMPORTANT: Detect the language of the user's problem and respond in the SAME language. If the problem is in Indonesian, respond in Indonesian. If in English, respond in English. If in pure math notation, respond in English.";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  quick:
    `You are a STEM tutor. Give a fast trick or shortcut to solve this problem. Be concise. ${LANGUAGE_RULE} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"trick": string, "answer": string, "note"?: string}`,
  full:
    `You are a STEM teacher. Explain step by step like in school curriculum. ${LANGUAGE_RULE} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"concept": string, "steps": [{"title": string, "content": string, "formula"?: string}], "answer": string}`,
  socratic:
    `You are a Socratic tutor. Do NOT give the answer. Guide the student with questions and hints only. ${LANGUAGE_RULE} Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"hint": string, "question": string, "encouragement": string}`,
};

type SolveInput = {
  mode: Mode;
  subject: string;
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
  pdfBase64?: string;
};

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

function buildUserContent(input: SolveInput, prefix: string): string {
  const parts: string[] = [];
  parts.push(`${prefix}`);
  parts.push(`Subject: ${input.subject}`);
  if (input.text) {
    parts.push(`Problem: ${input.text}`);
  } else if (input.imageBase64 || input.pdfBase64) {
    parts.push("Note: The student uploaded an image or PDF. Since direct file parsing is unavailable, please ask them to type out the problem text.");
  }
  return parts.join("\n");
}

function extractJson(text: string): any {
  // Remove markdown code fences
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Find the first { and last } and try parsing that
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }

  // Try finding JSON array too
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

    if ((count ?? 0) >= DAILY_LIMIT) {
      throw new Error(`Daily limit reached (${DAILY_LIMIT} problems/day). Upgrade to Premium for unlimited access.`);
    }

    const system = SYSTEM_PROMPTS[data.mode];
    const userContent = buildUserContent(data, "Solve this STEM problem.");
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