"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, Download, FileJson, FileSpreadsheet, FileCode, Loader2, Check, Calendar } from "lucide-react";

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [format, setFormat] = useState<"pdf" | "csv" | "json" | "markdown">("markdown");
  const [type, setType] = useState<"health" | "activity" | "security" | "custom">("health");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          format,
          title: `GritGauge ${type} Report`,
        }),
      });
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const formats = [
    { value: "markdown" as const, icon: FileCode, label: "Markdown", ext: ".md" },
    { value: "json" as const, icon: FileJson, label: "JSON", ext: ".json" },
    { value: "csv" as const, icon: FileSpreadsheet, label: "CSV", ext: ".csv" },
    { value: "pdf" as const, icon: FileText, label: "PDF", ext: ".pdf" },
  ];

  const types = [
    { value: "health" as const, label: "Health Report", desc: "Bus factor, response times, stale ratio, contributor metrics" },
    { value: "activity" as const, label: "Activity Report", desc: "Issue/PR velocity, commit frequency, release cadence" },
    { value: "security" as const, label: "Security Report", desc: "Vulnerability scan results, dependency audit, risk assessment" },
    { value: "custom" as const, label: "Custom Report", desc: "Choose specific metrics and sections to include" },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-brand-400" />
            Reports
          </h1>
          <p className="text-surface-400 mt-1">Generate and export detailed project reports</p>
        </div>

        <div className="space-y-6">
          {/* Report Type */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-brand-400" />
              Report Type
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {types.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    type === value
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-surface-700 hover:border-surface-600"
                  }`}
                >
                  <span className="text-white font-medium">{label}</span>
                  <p className="text-surface-400 text-xs mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-brand-400" />
              Export Format
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {formats.map(({ value, icon: Icon, label, ext }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    format === value
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-surface-700 hover:border-surface-600"
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2 text-surface-300" />
                  <span className="text-sm text-white">{label}</span>
                  <span className="text-xs text-surface-500 block">{ext}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Report Preview</h2>
            <div className="bg-surface-950 rounded-lg p-4 font-mono text-sm text-surface-300 overflow-x-auto">
              <pre className="whitespace-pre-wrap">
{format === "markdown" && `# GritGauge ${type} Report

Generated: ${new Date().toISOString()}
Type: ${type}

## Overview
This report provides a comprehensive analysis of your open-source project health.

## Metrics
- Health Score: 78/100
- Bus Factor: 4
- Response Time: 12.5h
- Stale Issue Ratio: 18%
- Active Contributors: 23

## Recommendations
1. Increase bus factor by onboarding more core maintainers
2. Reduce response time with automated issue triage
3. Close or label stale issues older than 30 days

---
Generated by [GritGauge](https://gritgauge.dev)`}
{format === "json" && `{
  "report": {
    "type": "${type}",
    "generatedAt": "${new Date().toISOString()}",
    "metrics": {
      "healthScore": 78,
      "busFactor": 4,
      "responseTimeAvg": 12.5,
      "staleIssueRatio": 0.18,
      "contributorCount": 23
    }
  }
}`}
{format === "csv" && `Metric,Value
Health Score,78
Bus Factor,4
Response Time (h),12.5
Stale Issue Ratio,0.18
Contributors,23`}
{format === "pdf" && `[PDF Report — Will be generated server-side with charts and formatted layout]`}
              </pre>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : generated ? (
              <>
                <Check className="w-5 h-5" />
                Report Generated!
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generate & Download
              </>
            )}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
