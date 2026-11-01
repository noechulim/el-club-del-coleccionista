import { connection } from "next/server";
import { AuthForm } from "./auth-form";
import { AccountDashboard } from "./account-dashboard";
import { createSupabaseServerClient, hasSupabaseConfig, getSessionUser } from "@/lib/supabase/server";
import type { CustomerOrder } from "@/lib/orders";
import type { CustomerAddress } from "@/lib/addresses";
import type { CustomerData, OrdersData, PaymentProofData } from "./account-dashboard";

export default function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AccountContent searchParams={searchParams} />;
}

export const instant = false;

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
  const user = await getSessionUser(supabase);
  if (!user) return <AuthForm notice={notice} />;

  const metadata = user.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? metadata.name ?? "").trim();
  const [derivedFirst, ...derivedLast] = fullName.split(/\s+/).filter(Boolean);
  const firstName = String(metadata.first_name ?? metadata.given_name ?? derivedFirst ?? "");
  const lastName = String(metadata.last_name ?? metadata.family_name ?? derivedLast.join(" "));
  const profileData = loadProfileData(supabase, user.id, firstName, lastName);
  const ordersData = loadOrdersData(supabase, user.id);
  const customerData = loadCustomerData(supabase, user.id, profileData);
  const paymentProofData = loadPaymentProofData(supabase, ordersData);
  const [profile, orders] = await Promise.all([profileData, ordersData]);
  return <AccountDashboard email={user.email ?? ""} firstName={profile.firstName} lastName={profile.lastName} ordersData={orders} customerData={customerData} paymentProofData={paymentProofData} adminAccess={profile.isAdmin} />;
}

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type ProfileData = { firstName: string; lastName: string; isAdmin: boolean };
const ORDER_PAGE_SIZE = 20;

async function loadProfileData(supabase: ServerClient, userId: string, firstName: string, lastName: string): Promise<ProfileData> {
  try {
    const { data, error } = await supabase.from("profiles").select("first_name, last_name, is_admin").eq("id", userId).maybeSingle();
    if (error) return { firstName, lastName, isAdmin: false };
    return { firstName: data?.first_name || firstName, lastName: data?.last_name || lastName, isAdmin: data?.is_admin === true };
  } catch {
    return { firstName, lastName, isAdmin: false };
  }
}

async function loadOrdersData(supabase: ServerClient, userId: string): Promise<OrdersData> {
  try {
    const { data: orderData, error: ordersQueryError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(ORDER_PAGE_SIZE + 1);
    const hasMore = (orderData?.length ?? 0) > ORDER_PAGE_SIZE;
    const orders = (orderData ?? []).slice(0, ORDER_PAGE_SIZE).map((order) => ({
      ...order,
      created_at_label: new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(order.created_at)),
    })) as CustomerOrder[];

    if (ordersQueryError) return { orders, ordersError: "No pudimos cargar tus pedidos. Intenta más tarde o contacta a la tienda." };
    return { orders, nextOffset: hasMore ? ORDER_PAGE_SIZE : null };
  } catch {
    return { orders: [], ordersError: "No pudimos cargar tus pedidos. Intenta más tarde o contacta a la tienda." };
  }
}

async function loadPaymentProofData(supabase: ServerClient, ordersData: Promise<OrdersData>): Promise<PaymentProofData> {
  const { orders } = await ordersData;
  if (!orders.some((order) => order.status === "pending_payment")) return { uploadTokens: {} };
  try {
    const { data, error } = await supabase.rpc("get_own_pending_payment_proofs");
    if (error) return { uploadTokens: {}, error: "La carga de comprobantes no está disponible por el momento. Conserva tu número de pedido y contacta a la tienda." };
    const tokens = new Map<string, string>((data ?? []).map((proof: { order_id: string; upload_token: string }) => [proof.order_id, proof.upload_token] as const));
    return { uploadTokens: Object.fromEntries(tokens) };
  } catch {
    return { uploadTokens: {}, error: "La carga de comprobantes no está disponible por el momento. Conserva tu número de pedido y contacta a la tienda." };
  }
}

async function loadCustomerData(supabase: ServerClient, userId: string, profileData: Promise<ProfileData>): Promise<CustomerData> {
  try {
    const [profile, { data: addressData, error: addressQueryError }] = await Promise.all([
      profileData,
      supabase.from("customer_addresses").select("id, label, recipient_name, phone, street, exterior_number, interior_number, neighborhood, city, state, postal_code, is_default").eq("user_id", userId).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    return {
      addresses: (addressData ?? []) as CustomerAddress[],
      addressesError: addressQueryError ? "No pudimos cargar tus direcciones. Puedes capturar la dirección durante la compra." : undefined,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  } catch {
    const profile = await profileData;
    return { addresses: [], addressesError: "No pudimos cargar tus direcciones. Puedes capturar la dirección durante la compra.", firstName: profile.firstName, lastName: profile.lastName };
  }
}

