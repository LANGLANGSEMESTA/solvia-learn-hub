import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = ["irsanwu@gmail.com", "irsanwuu@gmail.com"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ttbxsinxvjwoyimupwzr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function requireAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email!)) {
    throw new Error("Unauthorized");
  }
  return user;
}

export const getUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    await requireAdmin(supabase);

    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("*");
    const { data: problems } = await supabaseAdmin
      .from("problems")
      .select("user_id")

    const subsMap = Object.fromEntries((subs || []).map(s => [s.user_id, s]));
    const problemCount = (problems || []).reduce((acc: any, p: any) => {
      acc[p.user_id] = (acc[p.user_id] || 0) + 1;
      return acc;
    }, {});

    return (users?.users || []).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
      is_premium: subsMap[u.id]?.is_premium || false,
      premium_until: subsMap[u.id]?.premium_until || null,
      problem_count: problemCount[u.id] || 0,
    }));
  });

export const updateUserPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; isPremium: boolean; months?: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await requireAdmin(supabase);

    const premiumUntil = data.isPremium
      ? new Date(Date.now() + (data.months || 1) * 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabaseAdmin
      .from("subscriptions")
      .upsert({
        user_id: data.userId,
        is_premium: data.isPremium,
        premium_until: premiumUntil,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return { success: true };
  });