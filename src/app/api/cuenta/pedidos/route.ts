import { NextResponse } from "next/server";
import { createSupabaseServerClient, getSessionUser, hasSupabaseConfig } from "@/lib/supabase/server";
import type { CustomerOrder } from "@/lib/orders";

const ORDER_PAGE_SIZE = 20;

export async function GET(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const offsetValue = new URL(request.url).searchParams.get("offset") ?? "0";
  if (!/^(0|[1-9]\d{0,5})$/.test(offsetValue)) return NextResponse.json({ error: "invalid_offset" }, { status: 400 });
  const offset = Number(offsetValue);

  try {
    const supabase = await createSupabaseServerClient();
    const user = await getSessionUser(supabase);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + ORDER_PAGE_SIZE);
    if (error) return NextResponse.json({ error: "orders_unavailable" }, { status: 503 });

    const hasMore = (data?.length ?? 0) > ORDER_PAGE_SIZE;
    const orders = (data ?? []).slice(0, ORDER_PAGE_SIZE).map((order) => ({
      ...order,
      created_at_label: new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(order.created_at)),
    })) as CustomerOrder[];

    return NextResponse.json(
      { userId: user.id, orders: { orders, nextOffset: hasMore ? offset + ORDER_PAGE_SIZE : null } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "orders_unavailable" }, { status: 503 });
  }
}
