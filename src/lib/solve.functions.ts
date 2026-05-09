import { createServerFn } from "@tanstack/react-start";

type Mode = "quick" | "full" | "socratic";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  quick:
    'You are a STEM tutor. Give a fast trick or shortcut to solve this problem. Be concise. Respond in the same language as the question. Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"trick": string, "answer": string, "note"?: string}',
  full:
    'You are a STEM teacher. Explain step by step like in school curriculum. Respond in the same language as the question. Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"concept": string, "steps": [{"title": string, "content": string, "formula"?: string}], "answer": string}',
  socratic:
    'You are a Socratic tutor. Do NOT give the answer. Guide the student with questions and hints only. Respond in the same language as the question. Return ONLY valid JSON (no markdown, no code fences) with this exact shape: {"hint": string, "question": string, "encouragement": string}',
};

const MODEL = "claude-opus-4-5";

type SolveInput = {
  mode: Mode;
  subject: string;
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
  pdfBase64?: string;
};

async function callClaude(system: string, userBlocks: any[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: userBlocks }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.map((b: any) => (b.type === "text" ? b.text : "")).join("") ?? "";
  return text;
}

function buildBlocks(input: SolveInput, prefix: string) {
  const blocks: any[] = [];
  if (input.imageBase64) {
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.imageMediaType || "image/png",
        data: input.imageBase64,
      },
    });
  }
  if (input.pdfBase64) {
    blocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 },
    });
  }
  const textPart = `${prefix}\nSubject: ${input.subject}\n${input.text ? `Problem: ${input.text}` : "The problem is in the attached image/document."}`;
  blocks.push({ type: "text", text: textPart });
  return blocks;
}

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse AI response as JSON");
  }
}

export const solveProblem = createServerFn({ method: "POST" })
  .inputValidator((d: SolveInput) => d)
  .handler(async ({ data }) => {
    const system = SYSTEM_PROMPTS[data.mode];
    const blocks = buildBlocks(data, "Solve this STEM problem.");
    const text = await callClaude(system, blocks);
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const system = `You are a helpful STEM tutor continuing a conversation about a ${data.subject} problem. Respond in the same language as the user. Be clear and concise. Use plain text (no JSON).`;

    // First user message includes the original problem context
    const firstBlocks: any[] = [];
    if (data.imageBase64) {
      firstBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: data.imageMediaType || "image/png",
          data: data.imageBase64,
        },
      });
    }
    if (data.pdfBase64) {
      firstBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: data.pdfBase64 },
      });
    }
    firstBlocks.push({
      type: "text",
      text: `Original problem (${data.subject}):\n${data.originalText || "See attachment."}`,
    });

    const messages: any[] = [{ role: "user", content: firstBlocks }];
    for (const m of data.history) {
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: data.message });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error [${res.status}]: ${errText}`);
    }
    const json = await res.json();
    const text =
      json.content?.map((b: any) => (b.type === "text" ? b.text : "")).join("") ?? "";
    return { reply: text };
  });
