import "server-only";
import { createSupabaseServerClient, hasSupabaseConfig, getSessionUser } from "@/lib/supabase/server";
export async function getAdminAccess() {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return null;
  const { data, error } = await supabase.rpc("is_store_admin");
  return !error && data === true ? supabase : null;
}
