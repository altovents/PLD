import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/contact"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase unreachable — fail open so the app stays usable
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith("/api/auth")
  );

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect to onboarding if not yet completed (for authenticated users on dashboard routes)
  if (user && pathname.startsWith("/dashboard") || user && pathname.startsWith("/alerts") || user && pathname.startsWith("/reports") || user && pathname.startsWith("/transactions") || user && pathname.startsWith("/import")) {
    try {
      const { data: ctx } = await supabase
        .from("company_context")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (!ctx?.onboarding_completed && pathname !== "/onboarding") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    } catch {
      // If context table doesn't exist yet, skip redirect
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
