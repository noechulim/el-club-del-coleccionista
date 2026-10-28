import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refreshes expired tokens. Authorization is still checked in the page/actions.
  await supabase.auth.getClaims();
  return response;
}

// Solo las rutas que usan sesión pasan por el proxy; el catálogo público se sirve sin esperar a Supabase Auth.
export const config = {
  matcher: ["/cuenta/:path*", "/admin/:path*", "/checkout/:path*", "/pedido/:path*", "/auth/:path*", "/seguimiento/:path*", "/contacto/:path*"],
};
