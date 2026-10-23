import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next") || "/cuenta";
  const next = ["/cuenta", "/cuenta/nueva-contrasena", "/checkout"].includes(requestedNext) ? requestedNext : "/cuenta";

  if (code && hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/cuenta?error=callback", request.url));
}
