"use client";

import { useState } from "react";
import type { Issue, TriageResult } from "@/types";
import { formatRelativeTime, priorityColors, truncate } from "@/lib/utils";
import { Bot, ChevronDown, ChevronUp, ExternalLink, Tag } from "lucide-react";

interface Props {
  issues: Issue[];
}

export default function IssueTriagePanel({ issues }: Props) {
  const [triageResults, setTriageResults] = useState<Map<number, TriageResult>>(
    new Map()
  );
  const [loadingIssue, setLoadingIssue] = useState<number | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const handleTriage = async (issue: Issue) => {
    setLoadingIssue(issue.number);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issue.title,
          issueBody: issue.body,
          existingLabels: issue.labels,
        }),
      });
      const result: TriageResult = await res.json();
      result.issueNumber = issue.number;
      setTriageResults((prev) => new Map(prev).set(issue.number, result));
    } catch {
      // silent fail
    } finally {
      setLoadingIssue(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-brand-400" />
          AI Issue Triage
        </h3>
        <span className="text-sm text-surface-400">{issues.length} open issues</span>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {issues.map((issue) => {
          const triage = triageResults.get(issue.number);
          const expanded = expandedIssue === issue.number;

          return (
            <div key={issue.number} className="card !p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-brand-400 font-medium flex items-center gap-1.5"
                  >
                    {truncate(issue.title, 80)}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-surface-500">
                      #{issue.number} by {issue.author}
                    </span>
                    <span className="text-xs text-surface-600">·</span>
                    <span className="text-xs text-surface-500">
                      {formatRelativeTime(issue.createdAt)}
                    </span>
                    {issue.labels.map((label) => (
                      <span
                        key={label}
                        className="badge bg-surface-800 text-surface-400 border-surface-700"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {triage && (
                    <span
                      className={`badge border ${priorityColors[triage.priority]}`}
                    >
                      {triage.priority}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      setExpandedIssue(expanded ? null : issue.number)
                    }
                    className="btn-secondary !p-1.5"
                  >
                    {expanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div className="mt-3 pt-3 border-t border-surface-800 animate-slide-up">
                  {triage ? (
                    <div className="space-y-3">
                      <p className="text-sm text-surface-300">{triage.summary}</p>
                      <div className="flex flex-wrap gap-2">
                        {triage.suggestedLabels.map((label) => (
                          <span
                            key={label}
                            className="badge bg-brand-500/10 text-brand-400 border-brand-500/30"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-4 text-xs text-surface-400">
                        <span>Effort: {triage.estimatedEffort}</span>
                        <span>Sentiment: {triage.sentiment}</span>
                        {triage.isDuplicate && (
                          <span className="text-yellow-400">
                            Possible duplicate
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-surface-400">
                        {issue.body
                          ? truncate(issue.body, 200)
                          : "No description provided."}
                      </p>
                      <button
                        onClick={() => handleTriage(issue)}
                        disabled={loadingIssue === issue.number}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <Bot className="w-4 h-4" />
                        {loadingIssue === issue.number
                          ? "Analyzing..."
                          : "Run AI Triage"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {issues.length === 0 && (
          <div className="card text-center py-8 text-surface-500">
            No open issues found. 🎉
          </div>
        )}
      </div>
    </div>
  );
}
