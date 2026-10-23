"use server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
export type ContactState = { error?: string; reference?: string };
export async function sendContact(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const text = (key: string) => String(formData.get(key) || "").trim();
  if (text("website")) return { error: "No se pudo enviar la consulta." };
  const name = text("name"), email = text("email").toLowerCase(), subject = text("subject"), message = text("message"), orderNumber = text("orderNumber");
  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !subject || subject.length > 120 || message.length < 10 || message.length > 4000 || orderNumber.length > 40) return { error: "Revisa los datos. El mensaje debe tener entre 10 y 4,000 caracteres." };
  if (text("consent") !== "on") return { error: "Confirma que podemos usar estos datos para atender tu consulta." };
  if (!hasSupabaseConfig()) return { error: "El formulario no está disponible en este momento. Intenta más tarde." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("submit_contact_message", { p_name: name, p_email: email, p_subject: subject, p_order_number: orderNumber, p_message: message });
    if (error || !data) return { error: error?.message.includes("rate_limit") ? "Ya recibimos varias consultas con este correo. Espera una hora antes de enviar otra." : "No pudimos guardar tu consulta. Intenta más tarde." };
    return { reference: String(data) };
  } catch { return { error: "No pudimos conectar. Intenta más tarde." }; }
}
