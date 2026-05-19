import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// URLs web lain yang perlu diforward
const OTHER_WEBHOOK_URLS: string[] = [
  // tambahkan URL webhook web lain di sini kalau perlu
  // contoh: "https://web-lain.com/api/midtrans-webhook"
];

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

    // Forward ke web lain kalau bukan order Solvai
    if (!order_id.startsWith("SOLVAI-")) {
      await Promise.all(
        OTHER_WEBHOOK_URLS.map(url =>
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }).catch(console.error)
        )
      );
      return new Response("Forwarded", { status: 200 });
    }

    // Process Solvai order
    const parts = order_id.split("-");
    const userIdPrefix = parts[1];

    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.id.startsWith(userIdPrefix));

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const isSuccess =
      (transaction_status === "capture" && fraud_status === "accept") ||
      transaction_status === "settlement";

    if (isSuccess) {
      // Detect months from gross_amount
      const months = gross_amount >= 200000 ? 12 : 1;
      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + months);

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