import { Github } from "lucide-react";

async function getCsrfToken(): Promise<string> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}` || "http://localhost:3000";
    const url = `${baseUrl}/api/auth/csrf`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return data.csrfToken || "";
  } catch {
    return "";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const csrfToken = await getCsrfToken();
  const callbackUrl = searchParams.callbackUrl || "/dashboard";
  const error = searchParams.error;

  const errorMessages: Record<string, string> = {
    OAuthSignin: "There was a problem starting GitHub sign-in.",
    OAuthCallback: "GitHub authentication was denied or failed.",
    AccessDenied: "You must authorize GritGauge to access your GitHub account.",
    Configuration: "Server configuration error. Please try again later.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Sign in to GritGauge</h1>
          <p className="text-surface-400 mb-8">
            Connect your GitHub account to get started.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-sm text-red-400">
              {errorMessages[error] || `Authentication error: ${error}`}
            </div>
          )}

          <form action="/api/auth/signin/github" method="POST">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </button>
          </form>

          <p className="text-surface-500 text-xs mt-6">
            Only public repository access is requested. We never access private repos without explicit permission.
          </p>
        </div>
      </div>
    </div>
  );
}
