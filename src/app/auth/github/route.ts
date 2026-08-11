import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Get CSRF token
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}` || "";
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, { cache: "no-store" });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  if (!csrfToken) {
    redirect(`/auth/signin?error=Configuration&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // Forward the CSRF cookie from the server response to the client
  const setCookieHeader = csrfRes.headers.get("set-cookie");
  if (setCookieHeader) {
    // Parse and forward cookies
    const cookieStrings = setCookieHeader.split(",").map((c) => c.trim().split(";")[0]);
    for (const cookieStr of cookieStrings) {
      const [name, ...rest] = cookieStr.split("=");
      const value = rest.join("=");
      if (name && value) {
        cookies().set(name, value, {
          path: "/",
          secure: true,
          httpOnly: true,
          sameSite: "lax",
        });
      }
    }
  }

  // Build the NextAuth signin URL
  const signInUrl = new URL("/api/auth/signin/github", baseUrl);
  const params = new URLSearchParams();
  params.set("csrfToken", csrfToken);
  params.set("callbackUrl", callbackUrl);
  params.set("json", "true");

  // Do a POST to NextAuth's signin endpoint from the server
  const signInRes = await fetch(signInUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: setCookieHeader || "",
    },
    body: params.toString(),
    redirect: "manual",
  });

  const location = signInRes.headers.get("location");
  if (location) {
    redirect(location);
  }

  // Fallback: try getting the JSON response
  const body = await signInRes.text();
  try {
    const data = JSON.parse(body);
    if (data.url) {
      redirect(data.url);
    }
  } catch {
    // ignore
  }

  redirect(`/auth/signin?error=OAuthSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
