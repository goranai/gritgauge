"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const params = useSearchParams();
  const error = params?.get("error");
  const callbackUrl = params?.get("callbackUrl") || "/dashboard";

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
              {error === "OAuthSignin" && "There was a problem starting GitHub sign-in."}
              {error === "OAuthCallback" && "GitHub authentication was denied or failed."}
              {error === "AccessDenied" && "You must authorize GritGauge to access your GitHub account."}
              {!["OAuthSignin", "OAuthCallback", "AccessDenied"].includes(error) && `Authentication error: ${error}`}
            </div>
          )}

          <button
            onClick={() => signIn("github", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </button>

          <p className="text-surface-500 text-xs mt-6">
            Only public repository access is requested. We never access private repos without explicit permission.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-950" />}>
      <SignInContent />
    </Suspense>
  );
}
