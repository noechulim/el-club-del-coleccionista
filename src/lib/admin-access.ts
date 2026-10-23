import "server-only";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
export async function getAdminAccess() {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("is_store_admin");
  return !error && data === true ? supabase : null;
}
