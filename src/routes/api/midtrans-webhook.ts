import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const APIRoute = createAPIFileRoute("/api/midtrans-webhook")({
  POST: async ({ request }) => {
    const body = await request.json();

    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const hash = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (hash !== signature_key) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Extract user_id from order_id: SOLVAI-{userId8chars}-{timestamp}
    const parts = order_id.split("-");
    const userIdPrefix = parts[1];

    // Get user by id prefix
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.id.startsWith(userIdPrefix));

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const isSuccess =
      transaction_status === "capture" && fraud_status === "accept" ||
      transaction_status === "settlement";

    if (isSuccess) {
      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + 1);

      await supabaseAdmin
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          is_premium: true,
          premium_until: premiumUntil.toISOString(),
          midtrans_order_id: order_id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    }

    return new Response("OK", { status: 200 });
  },
});