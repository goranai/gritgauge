import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}` || "";

  // Fetch CSRF token from NextAuth
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, { cache: "no-store" });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken || "";

  // Forward all cookies from the CSRF response to the browser
  const setCookieHeaders = csrfRes.headers.getSetCookie?.() || csrfRes.headers.get("set-cookie")?.split(",") || [];
  for (const cookieStr of setCookieHeaders) {
    const parts = cookieStr.trim().split(";");
    const [nameVal] = parts;
    const [name, ...valParts] = nameVal.split("=");
    const value = valParts.join("=");
    if (name && value) {
      cookies().set(name, decodeURIComponent(value), {
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }

  // Return HTML that auto-submits a POST form to NextAuth
  const html = `<!DOCTYPE html>
<html>
<head><title>Redirecting to GitHub...</title></head>
<body>
  <p>Redirecting to GitHub for authentication...</p>
  <form id="f" action="/api/auth/signin/github" method="POST">
    <input type="hidden" name="csrfToken" value="${csrfToken}" />
    <input type="hidden" name="callbackUrl" value="${callbackUrl.replace(/"/g, '&quot;')}" />
  </form>
  <script>document.getElementById('f').submit();</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
