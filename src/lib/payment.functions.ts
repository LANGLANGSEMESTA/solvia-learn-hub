import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
const MIDTRANS_BASE_URL = "https://app.sandbox.midtrans.com/snap/v1";

type PaymentInput = {
  price?: number;
  months?: number;
  plan?: "basic" | "pro";
};

export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PaymentInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const price = data?.price || 49000;
    const months = data?.months || 1;
    const plan = data?.plan || "basic";

    // Encode plan di order_id: SOLVAI-{userPrefix}-{plan}-{timestamp}
    const orderId = `SOLVAI-${user.id.slice(0, 8)}-${plan}-${Date.now()}`;

    const planLabel = plan === "pro" ? "Pro" : "Basic";
    const periodLabel = months >= 12 ? "1 Year" : `${months} Month${months > 1 ? "s" : ""}`;
    const itemName = `Solvai ${planLabel} - ${periodLabel}`;

    const res = await fetch(`${MIDTRANS_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(MIDTRANS_SERVER_KEY + ":")}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: price,
        },
        customer_details: {
          email: user.email,
        },
        item_details: [
          {
            id: `SOLVAI-${plan.toUpperCase()}`,
            price,
            quantity: 1,
            name: itemName,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Midtrans error: ${err}`);
    }

    const json = await res.json();
    return { token: json.token, orderId };
  });