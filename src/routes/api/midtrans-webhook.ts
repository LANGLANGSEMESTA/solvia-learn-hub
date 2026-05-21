import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OTHER_WEBHOOK_URLS: string[] = [];

async function sendBrevoEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "SolvAi Tutor", email: "hello@solvai.app" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  }).catch(console.error);
}

export const APIRoute = createAPIFileRoute("/api/midtrans-webhook")({
  POST: async ({ request }) => {
    const body = await request.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const hash = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (hash !== signature_key) {
      return new Response("Invalid signature", { status: 401 });
    }

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
      // Decode plan dari order_id: SOLVAI-{userPrefix}-{plan}-{timestamp}
      const plan = parts[2] === "pro" ? "pro" : "basic";
      const months = plan === "pro"
        ? (gross_amount >= 600000 ? 12 : 1)
        : (gross_amount >= 300000 ? 12 : 1);

      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + months);

      await supabaseAdmin
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          is_premium: true,
          plan,
          premium_until: premiumUntil.toISOString(),
          midtrans_order_id: order_id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      const expiredDate = premiumUntil.toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
      });
      const planLabel = plan === "pro" ? "Pro" : "Basic";

      await sendBrevoEmail({
        to: user.email!,
        subject: `✦ Solvai ${planLabel} aktif!`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">Selamat! Solvai ${planLabel} aktif ✦</h2>
            <p style="color:#555;margin-bottom:24px;">
              Terima kasih sudah upgrade ke Solvai ${planLabel}.
            </p>
            <div style="background:#f5f5f5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:13px;color:#888;">Plan</p>
              <p style="margin:0;font-size:18px;font-weight:600;">Solvai ${planLabel}</p>
              <p style="margin:8px 0 4px;font-size:13px;color:#888;">Aktif hingga</p>
              <p style="margin:0;font-size:18px;font-weight:600;">${expiredDate}</p>
            </div>
            <a href="https://solvai.app/solve"
               style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
              Mulai solve →
            </a>
            <p style="margin-top:32px;font-size:12px;color:#aaa;">
              Solvai · Jika ada pertanyaan, balas email ini.
            </p>
          </div>
        `,
      });
    }

    return new Response("OK", { status: 200 });
  },
});