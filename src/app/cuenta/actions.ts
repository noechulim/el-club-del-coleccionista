"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

function requiredText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function authenticate(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseConfig()) {
    return { error: "Falta configurar la URL y la clave pública de Supabase en .env.local." };
  }

  const mode = requiredText(formData, "mode");
  const email = requiredText(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Escribe un correo válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const supabase = await createSupabaseServerClient();

  if (mode === "signup") {
    const firstName = requiredText(formData, "firstName");
    const lastName = requiredText(formData, "lastName");
    if (!firstName || !lastName) return { error: "Escribe tu nombre y apellido." };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}` },
        emailRedirectTo: `${getSiteOrigin()}/auth/callback?next=/cuenta`,
      },
    });

    if (error) {
      return { error: error.message.includes("already registered")
        ? "Ya existe una cuenta con ese correo. Inicia sesión."
        : "No se pudo crear la cuenta. Revisa tus datos e inténtalo de nuevo." };
    }

    if (!data.session) {
      return { message: "Cuenta creada. Revisa tu correo y confirma la dirección para poder iniciar sesión." };
    }
    redirect("/cuenta");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/cuenta");
}

function getSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function startGoogleSignIn() {
  if (!hasSupabaseConfig()) redirect("/cuenta?error=config");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteOrigin()}/auth/callback?next=/cuenta` },
  });
  if (error || !data.url) redirect("/cuenta?error=google-config");
  redirect(data.url);
}

export async function signOut() {
  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/cuenta");
}

export async function saveProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseConfig()) return { error: "Falta configurar Supabase." };
  const firstName = requiredText(formData, "firstName");
  const lastName = requiredText(formData, "lastName");
  if (!firstName || !lastName) return { error: "Nombre y apellido son obligatorios." };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Tu sesión terminó. Inicia sesión de nuevo." };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: "No se pudo guardar el perfil. Primero aplica la configuración SQL de Supabase." };
  return { message: "Tus datos se guardaron correctamente." };
}

export async function saveCustomerAddress(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseConfig()) return { error: "Falta configurar Supabase." };
  const id = requiredText(formData, "id");
  const postalCode = requiredText(formData, "postalCode");
  const address = {
    label: requiredText(formData, "label"),
    recipient_name: requiredText(formData, "recipientName"),
    phone: requiredText(formData, "phone"),
    street: requiredText(formData, "street"),
    exterior_number: requiredText(formData, "exteriorNumber"),
    interior_number: requiredText(formData, "interiorNumber"),
    neighborhood: requiredText(formData, "neighborhood"),
    city: requiredText(formData, "city"),
    state: requiredText(formData, "state"),
    postal_code: postalCode,
    is_default: formData.get("isDefault") === "on",
  };

  if (!address.label || !address.recipient_name || !address.street || !address.exterior_number || !address.neighborhood || !address.city || !address.state) {
    return { error: "Completa los campos obligatorios de la dirección." };
  }
  if (!/^\d{5}$/.test(postalCode)) return { error: "El código postal debe tener cinco dígitos." };
  if (address.label.length > 40 || address.recipient_name.length > 120 || address.phone.length > 30) {
    return { error: "Revisa el largo de la etiqueta y los datos de contacto." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Tu sesión terminó. Inicia sesión de nuevo." };

  const { error } = await supabase.rpc("save_customer_address", {
    p_id: id || null,
    p_address: address,
  });
  if (error) return { error: error.message.includes("does not exist")
    ? "Aplica la migración de direcciones guardadas en Supabase e inténtalo otra vez."
    : "No se pudo guardar la dirección. Revisa los datos e inténtalo de nuevo." };

  revalidatePath("/cuenta");
  revalidatePath("/checkout");
  return { message: id ? "La dirección se actualizó." : "La dirección se guardó." };
}

export async function deleteCustomerAddress(formData: FormData): Promise<FormState> {
  if (!hasSupabaseConfig()) return { error: "Falta configurar Supabase." };
  const id = requiredText(formData, "id");
  if (!id) return { error: "No se encontró la dirección que quieres eliminar." };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Tu sesión terminó. Inicia sesión de nuevo." };

  const { error } = await supabase.rpc("delete_customer_address", { p_id: id });
  if (error) return { error: "No se pudo eliminar la dirección. Actualiza la página e inténtalo de nuevo." };

  revalidatePath("/cuenta");
  revalidatePath("/checkout");
  return { message: "La dirección se eliminó." };
}
