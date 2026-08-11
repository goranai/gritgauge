"use client";

import { useState } from "react";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { parseRepoUrl } from "@/lib/utils";

interface Props {
  onAnalyze: (owner: string, name: string) => void;
  loading: boolean;
}

export default function RepoInput({ onAnalyze, loading }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseRepoUrl(url.trim());
    if (!parsed) {
      setError("Enter a valid GitHub repo: owner/repo or full URL");
      return;
    }

    onAnalyze(parsed.owner, parsed.name);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            placeholder="Enter GitHub repo — e.g. facebook/react or full URL..."
            className="input-field pl-11"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Repo"
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </form>
  );
}
