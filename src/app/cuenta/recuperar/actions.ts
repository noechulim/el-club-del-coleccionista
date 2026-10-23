"use server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
type RecoveryState = { error?: string; message?: string };
export async function requestRecovery(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  if (!hasSupabaseConfig()) return { error: "La recuperación no está disponible por el momento." };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: "Escribe un correo válido." };
  const db = await createSupabaseServerClient();
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/cuenta/nueva-contrasena` });
  if (error) return { error: "No pudimos procesar la solicitud. Espera unos minutos e intenta de nuevo." };
  return { message: "Si el correo está registrado, recibirás un enlace para cambiar tu contraseña. Revisa también la carpeta de spam." };
}
export async function changePassword(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  if (!hasSupabaseConfig()) return { error: "El servicio no está disponible por el momento." };
  const password = String(formData.get("password") || "");
  if (password.length < 8 || password.length > 128) return { error: "Usa una contraseña de entre 8 y 128 caracteres." };
  if (password !== formData.get("confirmation")) return { error: "Las contraseñas no coinciden." };
  const db = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { error: "El enlace venció o no hay una sesión válida. Solicita un nuevo enlace de recuperación." };
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: "No pudimos actualizar la contraseña. Prueba con una distinta o solicita otro enlace." };
  return { message: "Tu contraseña se actualizó. Ya puedes continuar en tu cuenta." };
}
