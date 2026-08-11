"use client";

import { useState } from "react";
import type { PullRequest, PRReviewResult } from "@/types";
import { formatRelativeTime, riskColors } from "@/lib/utils";
import { GitPullRequest, ExternalLink, Sparkles, Shield } from "lucide-react";

interface Props {
  prs: PullRequest[];
}

export default function PRReviewPanel({ prs }: Props) {
  const [reviewResults, setReviewResults] = useState<
    Map<number, PRReviewResult>
  >(new Map());
  const [loadingPR, setLoadingPR] = useState<number | null>(null);

  const handleReview = async (pr: PullRequest) => {
    setLoadingPR(pr.number);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pr.title,
          prBody: pr.body,
          filesChanged: pr.filesChanged,
          additions: pr.additions,
          deletions: pr.deletions,
        }),
      });
      const result: PRReviewResult = await res.json();
      result.prNumber = pr.number;
      setReviewResults((prev) => new Map(prev).set(pr.number, result));
    } catch {
      // silent fail
    } finally {
      setLoadingPR(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-purple-400" />
          PR Review Assistant
        </h3>
        <span className="text-sm text-surface-400">{prs.length} open PRs</span>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {prs.map((pr) => {
          const review = reviewResults.get(pr.number);

          return (
            <div key={pr.number} className="card !p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-purple-400 font-medium flex items-center gap-1.5"
                  >
                    {pr.title}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-surface-500">
                      #{pr.number} by {pr.author}
                    </span>
                    <span className="text-xs text-surface-600">·</span>
                    <span className="text-xs text-green-400">
                      +{pr.additions}
                    </span>
                    <span className="text-xs text-red-400">
                      -{pr.deletions}
                    </span>
                    <span className="text-xs text-surface-500">
                      {pr.filesChanged} files
                    </span>
                    <span className="text-xs text-surface-600">·</span>
                    <span className="text-xs text-surface-500">
                      {formatRelativeTime(pr.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {review && (
                    <span
                      className={`badge border ${riskColors[review.riskLevel]}`}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {review.riskLevel} risk
                    </span>
                  )}
                </div>
              </div>

              {/* Review Result */}
              {review && (
                <div className="mt-3 pt-3 border-t border-surface-800 animate-slide-up space-y-3">
                  <p className="text-sm text-surface-300">{review.summary}</p>

                  <div>
                    <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                      Key Changes
                    </h4>
                    <ul className="space-y-1">
                      {review.keyChanges.map((change, i) => (
                        <li
                          key={i}
                          className="text-sm text-surface-300 flex items-start gap-2"
                        >
                          <span className="text-brand-400 mt-1">•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {review.potentialIssues.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">
                        Potential Issues
                      </h4>
                      <ul className="space-y-1">
                        {review.potentialIssues.map((issue, i) => (
                          <li
                            key={i}
                            className="text-sm text-red-300 flex items-start gap-2"
                          >
                            <span className="text-red-400 mt-1">⚠</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-surface-400">
                      {review.testCoverageNote}
                    </span>
                    <span className="text-surface-600">·</span>
                    <span
                      className={`font-semibold ${
                        review.recommendation === "approve"
                          ? "text-green-400"
                          : review.recommendation === "request_changes"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {review.recommendation.replace("_", " ")}
                    </span>
                  </div>
                </div>
              )}

              {/* Run Review Button */}
              {!review && (
                <button
                  onClick={() => handleReview(pr)}
                  disabled={loadingPR === pr.number}
                  className="btn-secondary text-sm mt-3 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {loadingPR === pr.number
                    ? "Reviewing..."
                    : "Run AI Review"}
                </button>
              )}
            </div>
          );
        })}

        {prs.length === 0 && (
          <div className="card text-center py-8 text-surface-500">
            No open pull requests. 🎉
          </div>
        )}
      </div>
    </div>
  );
}
