"use server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/lib/admin-access";
export async function updateContact(_previous: { error?: string; message?: string }, formData: FormData): Promise<{ error?: string; message?: string }> {
  const db = await getAdminAccess();
  if (!db) return { error: "No tienes permisos para gestionar consultas." };
  const id = String(formData.get("id") || ""), status = String(formData.get("status") || "");
  if (!/^[a-f0-9-]{36}$/i.test(id) || !["new", "in_progress", "resolved"].includes(status)) return { error: "Datos no válidos." };
  const { data, error } = await db.from("contact_messages").update({ status }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "No pudimos actualizar la consulta." };
  revalidatePath("/admin/contacto"); revalidatePath("/admin");
  return { message: "Estado actualizado." };
}
