"use client";

import { useState, useCallback } from "react";
import { Sparkles, Shield, FileText, GitPullRequest, AlertCircle, Loader2, X } from "lucide-react";
import type { Issue, PullRequest } from "@/types";

interface TriageResult { priority: string; effort: string; estimatedEffort?: string; suggestedLabels: string[]; summary: string; sentiment: string; }
interface ReviewResult { summary: string; riskLevel: string; suggestedReviewers: string[]; keyChanges: string[]; potentialIssues: string[]; recommendation: string; }
interface ScanData { riskScore?: number; vulnerabilities?: any[]; dependencyIssues?: any[]; codeIssues?: any[]; summary?: string; scannedAt?: string; }

interface Props { repoFullName: string; issues: Issue[]; prs: PullRequest[]; }

export default function AIActions({ repoFullName, issues, prs }: Props) {
  const [triageResults, setTriageResults] = useState<TriageResult[] | null>(null);
  const [reviewResults, setReviewResults] = useState<ReviewResult[] | null>(null);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [changelog, setChangelog] = useState<string | null>(null);
  const [loading, setLoading] = useState("");
  const [activeAction, setActiveAction] = useState("");

  const runTriage = useCallback(async () => {
    if (triageResults) { setActiveAction(activeAction === "triage" ? "" : "triage"); return; }
    setLoading("triage"); setActiveAction("triage");
    const r: TriageResult[] = [];
    for (const issue of issues.slice(0, 5)) {
      try {
        const res = await fetch("/api/triage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: issue.title, issueBody: issue.body || "", existingLabels: issue.labels || [], repo: repoFullName, issueNumber: issue.number }) });
        if (res.ok) { const d = await res.json(); if (d.success) r.push(d.data || d); }
      } catch {}
    }
    setTriageResults(r); setLoading("");
  }, [issues, repoFullName, triageResults, activeAction]);

  const runReview = useCallback(async () => {
    if (reviewResults) { setActiveAction(activeAction === "review" ? "" : "review"); return; }
    setLoading("review"); setActiveAction("review");
    const r: ReviewResult[] = [];
    for (const pr of prs.slice(0, 3)) {
      try {
        const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: pr.title, prBody: pr.body || "", filesChanged: 5, additions: 100, deletions: 50 }) });
        if (res.ok) { const d = await res.json(); r.push(d); }
      } catch {}
    }
    setReviewResults(r); setLoading("");
  }, [prs, activeAction, reviewResults]);

  const runScan = useCallback(async () => {
    if (scanData) { setActiveAction(activeAction === "security" ? "" : "security"); return; }
    setLoading("scan"); setActiveAction("security");
    try {
      const res = await fetch("/api/security", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: repoFullName, scanType: "full", targetRef: "main" }) });
      const d = await res.json();
      if (d.success) { const parsed = typeof d.data === "string" ? JSON.parse(d.data) : (d.data || d); setScanData(parsed); }
    } catch {}
    setLoading("");
  }, [repoFullName, scanData, activeAction]);

  const runChangelog = useCallback(async () => {
    if (changelog) { setActiveAction(activeAction === "changelog" ? "" : "changelog"); return; }
    setLoading("changelog"); setActiveAction("changelog");
    try {
      const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "activity", format: "markdown", title: "Changelog", repoId: repoFullName }) });
      if (res.ok) { const ct = res.headers.get("content-type") || ""; setChangelog(ct.includes("text") ? await res.text() : JSON.stringify(await res.json())); }
      else setChangelog("Generation failed. Try again.");
    } catch {}
    setLoading("");
  }, [repoFullName, changelog, activeAction]);

  const badge = (v: string) => { const c = v?.toLowerCase() || ""; if (c.includes("critical") || c.includes("high")) return "text-red-400 bg-red-500/10"; if (c.includes("medium")) return "text-yellow-400 bg-yellow-500/10"; return "text-green-400 bg-green-500/10"; };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-brand-400" /><h3 className="text-lg font-semibold text-white">AI-Powered Analysis</h3></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={runTriage} disabled={!!loading} className="p-3 rounded-lg border border-surface-700 hover:border-orange-500 text-left transition-all disabled:opacity-50">
            <AlertCircle className="w-5 h-5 text-orange-400 mb-1" /><div className="text-white text-sm font-medium">Triage</div><div className="text-surface-500 text-xs">{loading === "triage" ? "Working..." : triageResults ? `View (${triageResults.length})` : `${issues.length} issues`}</div></button>
          <button onClick={runReview} disabled={!!loading} className="p-3 rounded-lg border border-surface-700 hover:border-blue-500 text-left transition-all disabled:opacity-50">
            <GitPullRequest className="w-5 h-5 text-blue-400 mb-1" /><div className="text-white text-sm font-medium">Review</div><div className="text-surface-500 text-xs">{loading === "review" ? "Working..." : reviewResults ? `View (${reviewResults.length})` : `${prs.length} PRs`}</div></button>
          <button onClick={runScan} disabled={!!loading} className="p-3 rounded-lg border border-surface-700 hover:border-red-500 text-left transition-all disabled:opacity-50">
            <Shield className="w-5 h-5 text-red-400 mb-1" /><div className="text-white text-sm font-medium">Security</div><div className="text-surface-500 text-xs">{loading === "scan" ? "Scanning..." : scanData ? "View report" : "Full audit"}</div></button>
          <button onClick={runChangelog} disabled={!!loading} className="p-3 rounded-lg border border-surface-700 hover:border-green-500 text-left transition-all disabled:opacity-50">
            <FileText className="w-5 h-5 text-green-400 mb-1" /><div className="text-white text-sm font-medium">Changelog</div><div className="text-surface-500 text-xs">{loading === "changelog" ? "Generating..." : changelog ? "View" : "Generate"}</div></button>
        </div>
      </div>

      {/* Triage Results */}
      {activeAction === "triage" && triageResults && (
        <div className="card border-orange-500/20">
          <div className="flex items-center justify-between mb-4"><h4 className="text-white font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-400" />AI Triage Results</h4><button onClick={() => setActiveAction("")} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button></div>
          <div className="space-y-2">
            {triageResults.map((r, i) => (
              <div key={i} className="bg-surface-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge(r.priority)}`}>{r.priority}</span><span className="text-xs text-surface-400">effort: {r.effort || r.estimatedEffort}</span><span className="text-xs text-surface-500">{r.sentiment}</span></div>
                <p className="text-sm text-surface-300">{r.summary}</p>
                <div className="flex gap-1 mt-2 flex-wrap">{(r.suggestedLabels || []).map((l: string) => (<span key={l} className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-300">{l}</span>))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Results */}
      {activeAction === "review" && reviewResults && (
        <div className="card border-blue-500/20">
          <div className="flex items-center justify-between mb-4"><h4 className="text-white font-semibold flex items-center gap-2"><GitPullRequest className="w-4 h-4 text-blue-400" />AI PR Reviews</h4><button onClick={() => setActiveAction("")} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button></div>
          <div className="space-y-2">
            {reviewResults.map((r, i) => (
              <div key={i} className="bg-surface-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge(r.riskLevel)}`}>{r.riskLevel} risk</span><span className="text-xs text-surface-400">→ {r.recommendation}</span></div>
                <p className="text-sm text-surface-300">{r.summary}</p>
                {(r.keyChanges || []).length > 0 && <div className="flex gap-1 mt-2 flex-wrap">{r.keyChanges.map((c: string, j: number) => (<span key={j} className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-300">{c}</span>))}</div>}
                {(r.potentialIssues || []).length > 0 && <div className="mt-2 text-xs text-red-400">{(r.potentialIssues || []).join("; ")}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Scan */}
      {activeAction === "security" && scanData && (
        <div className="card border-red-500/20">
          <div className="flex items-center justify-between mb-4"><h4 className="text-white font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" />Security Audit</h4><button onClick={() => setActiveAction("")} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-surface-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-400">{scanData.riskScore ?? "—"}</div><div className="text-xs text-surface-400">Risk Score</div></div>
            <div className="bg-surface-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-yellow-400">{(scanData.vulnerabilities || []).length}</div><div className="text-xs text-surface-400">Vulnerabilities</div></div>
            <div className="bg-surface-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-400">{(scanData.dependencyIssues || []).length}</div><div className="text-xs text-surface-400">Dep Issues</div></div>
          </div>
          <div className="bg-surface-900 rounded-lg p-4"><h5 className="text-sm font-semibold text-white mb-2">Assessment</h5><p className="text-sm text-surface-300 leading-relaxed">{scanData.summary || "No issues found."}</p></div>
          {scanData.scannedAt && <div className="text-xs text-surface-500 mt-3">Scanned: {new Date(scanData.scannedAt).toLocaleString()}</div>}
        </div>
      )}

      {/* Changelog */}
      {activeAction === "changelog" && changelog && (
        <div className="card border-green-500/20">
          <div className="flex items-center justify-between mb-4"><h4 className="text-white font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-green-400" />Changelog</h4><button onClick={() => setActiveAction("")} className="text-surface-400 hover:text-white"><X className="w-4 h-4" /></button></div>
          <div className="text-sm text-surface-300 bg-surface-900 rounded-lg p-4 overflow-auto max-h-96 leading-relaxed" dangerouslySetInnerHTML={{ __html: changelog.replace(/\n/g, "<br/>").replace(/##\s*(.+)/g, "<strong>$1</strong>").replace(/- (.*)/g, "• $1") }} />
        </div>
      )}

      {loading && <div className="flex items-center justify-center gap-2 text-surface-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">{loading === "triage" ? "Analyzing issues with AI..." : loading === "review" ? "Reviewing PRs with AI..." : loading === "scan" ? "Running security audit..." : "Generating changelog..."}</span></div>}
    </div>
  );
}
