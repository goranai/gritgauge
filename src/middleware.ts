import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/validation";

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/settings/:path*", "/analytics/:path*", "/compare/:path*", "/reports/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Rate Limiting for API Routes ───
  if (pathname.startsWith("/api/")) {
    // Skip rate limiting for auth endpoints
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const { allowed, remaining, resetAt } = checkRateLimit(`api:${ip}`, 300, 60000);

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Try again later.",
          meta: { resetAt },
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(resetAt));
    return response;
  }

  // ─── Auth Protection for App Routes ───
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}
