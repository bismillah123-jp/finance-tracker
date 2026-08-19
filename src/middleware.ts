import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run auth check on pages that actually need it
  const isProtected = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/";

  // Skip middleware for unrelated paths early
  if (!isProtected && !isAuthPage) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users away from protected routes
    if (!user && isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect authenticated users away from auth pages
    if (user && isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch (error) {
    // On cold start / Supabase timeout — don't crash, just let the request through
    // The client-side auth check will handle redirect if needed
    console.error("Middleware auth check failed:", error);

    // If trying to access dashboard and auth failed, redirect to login as fallback
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Only match pages that need auth — skip static assets, api routes, etc.
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
  ],
};
