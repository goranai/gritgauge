"use client";

import { useState } from "react";
import { Sparkles, Shield, FileText, GitPullRequest, AlertCircle, Loader2, Check, X } from "lucide-react";
import type { Issue, PullRequest } from "@/types";

interface TriageResult {
  priority: string;
  effort: string;
  suggestedLabels: string[];
  summary: string;
  sentiment: string;
}

interface ReviewResult {
  summary: string;
  riskLevel: string;
  suggestedReviewers: string[];
  keyChanges: string[];
  potentialIssues: string[];
  recommendation: string;
}

interface Props {
  repoFullName: string;
  issues: Issue[];
  prs: PullRequest[];
}

export default function AIActions({ repoFullName, issues, prs }: Props) {
  const [triageResults, setTriageResults] = useState<Map<number, TriageResult>>(new Map());
  const [reviewResults, setReviewResults] = useState<Map<number, ReviewResult>>(new Map());
  const [triaging, setTriaging] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [changelog, setChangelog] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const runTriage = async () => {
    setTriaging(true);
    setActiveAction("triage");
    const results = new Map<number, TriageResult>();
    for (const issue of issues.slice(0, 5)) {
      try {
        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: issue.title,
            issueBody: issue.body || "",
            existingLabels: issue.labels || [],
            repo: repoFullName,
            issueNumber: issue.number,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) results.set(issue.number, data.data || data);
        }
      } catch {}
    }
    setTriageResults(results);
    setTriaging(false);
  };

  const runReview = async () => {
    setReviewing(true);
    setActiveAction("review");
    const results = new Map<number, ReviewResult>();
    for (const pr of prs.slice(0, 3)) {
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: pr.title,
            prBody: pr.body || "",
            filesChanged: pr.filesChanged || 5,
            additions: pr.additions || 100,
            deletions: pr.deletions || 50,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          results.set(pr.number, data);
        }
      } catch {}
    }
    setReviewResults(results);
    setReviewing(false);
  };

  const runSecurityScan = async () => {
    setScanning(true);
    setActiveAction("security");
    try {
      const [owner, name] = repoFullName.split("/");
      const res = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName, scanType: "full", targetRef: "main" }),
      });
      const data = await res.json();
      if (data.success) {
        const result = data.data || data.result || data;
        setScanResult(typeof result === "string" ? result : JSON.stringify(result, null, 2));
      } else {
        setScanResult("Scan error: " + (data.error || "Unknown"));
      }
    } catch (e: any) {
      setScanResult("Security scan failed: " + e.message);
    }
    setScanning(false);
  };

  const generateChangelog = async () => {
    setGenerating(true);
    setActiveAction("changelog");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "activity", format: "markdown", title: `Changelog - ${repoFullName}`, repoId: repoFullName }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setChangelog("Generation failed: " + (errData.error || res.statusText));
      } else {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("text")) {
          setChangelog(await res.text());
        } else {
          const data = await res.json();
          setChangelog(data.content || data.data || JSON.stringify(data, null, 2));
        }
      }
    } catch (e: any) {
      setChangelog("Changelog generation failed: " + e.message);
    }
    setGenerating(false);
  };

  const priorityColor = (p: string) => {
    if (p?.toLowerCase().includes("critical") || p?.toLowerCase().includes("high")) return "text-red-400 bg-red-500/10";
    if (p?.toLowerCase().includes("medium")) return "text-yellow-400 bg-yellow-500/10";
    return "text-green-400 bg-green-500/10";
  };

  return (
    <div className="space-y-4">
      {/* AI Action Buttons */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-semibold text-white">AI-Powered Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={runTriage} disabled={triaging || issues.length === 0}
            className="p-3 rounded-lg border border-surface-700 hover:border-brand-500 text-left transition-all disabled:opacity-50">
            <AlertCircle className="w-5 h-5 text-orange-400 mb-1" />
            <div className="text-white text-sm font-medium">Triage Issues</div>
            <div className="text-surface-500 text-xs">{triaging ? "Analyzing..." : `${issues.length} issues`}</div>
          </button>
          <button onClick={runReview} disabled={reviewing || prs.length === 0}
            className="p-3 rounded-lg border border-surface-700 hover:border-brand-500 text-left transition-all disabled:opacity-50">
            <GitPullRequest className="w-5 h-5 text-blue-400 mb-1" />
            <div className="text-white text-sm font-medium">Review PRs</div>
            <div className="text-surface-500 text-xs">{reviewing ? "Analyzing..." : `${prs.length} PRs`}</div>
          </button>
          <button onClick={runSecurityScan} disabled={scanning}
            className="p-3 rounded-lg border border-surface-700 hover:border-red-500 text-left transition-all disabled:opacity-50">
            <Shield className="w-5 h-5 text-red-400 mb-1" />
            <div className="text-white text-sm font-medium">Security Scan</div>
            <div className="text-surface-500 text-xs">{scanning ? "Scanning..." : "Full audit"}</div>
          </button>
          <button onClick={generateChangelog} disabled={generating}
            className="p-3 rounded-lg border border-surface-700 hover:border-green-500 text-left transition-all disabled:opacity-50">
            <FileText className="w-5 h-5 text-green-400 mb-1" />
            <div className="text-white text-sm font-medium">Changelog</div>
            <div className="text-surface-500 text-xs">{generating ? "Generating..." : "AI-powered"}</div>
          </button>
        </div>
      </div>

      {/* Triage Results */}
      {activeAction === "triage" && triageResults.size > 0 && (
        <div className="card border-brand-500/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" /> AI Triage Results
            </h4>
            <button onClick={() => { setActiveAction(null); setTriageResults(new Map()); }} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {Array.from(triageResults.entries()).map(([num, r]) => (
              <div key={num} className="bg-surface-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-surface-500">#{num}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(r.priority)}`}>{r.priority}</span>
                  <span className="text-xs text-surface-400">effort: {r.effort}</span>
                </div>
                <p className="text-sm text-surface-300">{r.summary}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {r.suggestedLabels?.map((l: string) => (
                    <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-300">{l}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Results */}
      {activeAction === "review" && reviewResults.size > 0 && (
        <div className="card border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-blue-400" /> AI PR Reviews
            </h4>
            <button onClick={() => { setActiveAction(null); setReviewResults(new Map()); }} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {Array.from(reviewResults.entries()).map(([num, r]) => (
              <div key={num} className="bg-surface-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-surface-500">PR #{num}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.riskLevel === "high" ? "text-red-400 bg-red-500/10" : r.riskLevel === "medium" ? "text-yellow-400 bg-yellow-500/10" : "text-green-400 bg-green-500/10"}`}>
                    {r.riskLevel} risk
                  </span>
                  <span className="text-xs text-surface-400">→ {r.recommendation}</span>
                </div>
                <p className="text-sm text-surface-300">{r.summary}</p>
                {r.keyChanges?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {r.keyChanges.map((c: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-300">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Scan Result */}
      {activeAction === "security" && scanResult && (
        <div className="card border-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" /> Security Scan Result
            </h4>
            <button onClick={() => { setActiveAction(null); setScanResult(null); }} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <pre className="text-xs text-surface-300 bg-surface-900 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap">{scanResult}</pre>
        </div>
      )}

      {/* Changelog */}
      {activeAction === "changelog" && changelog && (
        <div className="card border-green-500/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-400" /> AI-Generated Changelog
            </h4>
            <button onClick={() => { setActiveAction(null); setChangelog(null); }} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-sm text-surface-300 bg-surface-900 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap">{changelog}</div>
        </div>
      )}

      {/* Loading indicators */}
      {(triaging || reviewing || scanning || generating) && (
        <div className="flex items-center justify-center gap-2 text-surface-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">
            {triaging && "AI is triaging issues..."}
            {reviewing && "AI is reviewing PRs..."}
            {scanning && "Running security scan..."}
            {generating && "Generating changelog..."}
          </span>
        </div>
      )}
    </div>
  );
}
