import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function makeToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { problemId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("problems")
      .select("id, share_token, user_id")
      .eq("id", data.problemId)
      .maybeSingle();
    if (!existing || existing.user_id !== userId) throw new Error("Not found");
    if (existing.share_token) return { token: existing.share_token };
    const token = makeToken();
    const { error } = await supabase
      .from("problems")
      .update({ share_token: token })
      .eq("id", data.problemId);
    if (error) throw new Error(error.message);
    return { token };
  });

export const getSharedProblem = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("problems")
      .select("subject, mode, input_text, result, created_at")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Shared problem not found");
    return row;
  });

