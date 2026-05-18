import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
const MIDTRANS_BASE_URL = "https://app.sandbox.midtrans.com/snap/v1";

export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const orderId = `SOLVAI-${user.id.slice(0, 8)}-${Date.now()}`;

    const res = await fetch(`${MIDTRANS_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(MIDTRANS_SERVER_KEY + ":")}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: 29000,
        },
        customer_details: {
          email: user.email,
        },
        item_details: [
          {
            id: "SOLVAI-PREMIUM",
            price: 29000,
            quantity: 1,
            name: "Solvai Premium - 1 Bulan",
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Midtrans error: ${err}`);
    }

    const data = await res.json();
    return { token: data.token, orderId };
  });