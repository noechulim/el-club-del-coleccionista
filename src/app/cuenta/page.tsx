import { Suspense } from "react";
import { connection } from "next/server";
import { AuthForm } from "./auth-form";
import { AccountDashboard } from "./account-dashboard";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { CustomerOrder } from "@/lib/orders";
import type { CustomerAddress } from "@/lib/addresses";

export default function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <Suspense fallback={null}><AccountContent searchParams={searchParams} /></Suspense>;
}

async function AccountContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // This route reads a live Supabase session, so render this subtree per request.
  await connection();
  const { error: queryError } = await searchParams;
  const notice = queryError === "google-config"
    ? "Google aún no está configurado como proveedor de acceso en Supabase."
    : queryError === "callback"
      ? "No se pudo completar el acceso. Inténtalo de nuevo."
      : undefined;
  if (!hasSupabaseConfig()) return <AuthForm notice="El acceso a cuentas no está disponible por el momento. Intenta más tarde." />;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <AuthForm notice={notice} />;

  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle();
  const metadata = user.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? metadata.name ?? "").trim();
  const [derivedFirst, ...derivedLast] = fullName.split(/\s+/).filter(Boolean);
  const firstName = profile?.first_name || String(metadata.first_name ?? metadata.given_name ?? derivedFirst ?? "");
  const lastName = profile?.last_name || String(metadata.last_name ?? metadata.family_name ?? derivedLast.join(" ") ?? "");

  const [{ data: isAdmin }, { data: orderData, error: ordersError }, { data: proofTokens, error: proofTokenError }, { data: addressData, error: addressQueryError }] = await Promise.all([
    supabase.rpc("is_store_admin"),
    supabase.from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_own_pending_payment_proofs"),
    supabase.from("customer_addresses").select("id, label, recipient_name, phone, street, exterior_number, interior_number, neighborhood, city, state, postal_code, is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const uploadTokens = new Map((proofTokens ?? []).map((proof: { order_id: string; upload_token: string }) => [proof.order_id, proof.upload_token]));
  const orders = (orderData ?? []).map((order) => ({
    ...order,
    proof_upload_token: uploadTokens.get(order.id) ?? null,
    created_at_label: new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(order.created_at)),
  })) as CustomerOrder[];
  const addresses = (addressData ?? []) as CustomerAddress[];
  return <AccountDashboard email={user.email ?? ""} firstName={firstName} lastName={lastName} isAdmin={Boolean(isAdmin)} orders={orders} ordersError={ordersError ? "No pudimos cargar tus pedidos. Intenta más tarde o contacta a la tienda." : undefined} proofSetupError={proofTokenError ? "La carga de comprobantes no está disponible por el momento. Conserva tu número de pedido y contacta a la tienda." : undefined} addresses={addresses} addressesError={addressQueryError ? "No pudimos cargar tus direcciones. Puedes capturar la dirección durante la compra." : undefined} />;
}

