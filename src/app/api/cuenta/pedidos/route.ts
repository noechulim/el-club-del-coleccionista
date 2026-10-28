import { NextResponse } from "next/server";
import { createSupabaseServerClient, getSessionUser, hasSupabaseConfig } from "@/lib/supabase/server";
import type { CustomerOrder } from "@/lib/orders";

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  try {
    const supabase = await createSupabaseServerClient();
    const user = await getSessionUser(supabase);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "orders_unavailable" }, { status: 503 });

    const orders = (data ?? []).map((order) => ({
      ...order,
      created_at_label: new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(order.created_at)),
    })) as CustomerOrder[];

    return NextResponse.json(
      { userId: user.id, orders: { orders } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "orders_unavailable" }, { status: 503 });
  }
}
