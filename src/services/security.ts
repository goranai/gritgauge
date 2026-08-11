import OpenAI from "openai";
import type { SecurityScanResult, Vulnerability, DependencyIssue, CodeIssue } from "@/types";

function getAIClient(): { client: OpenAI; model: string } | null {
  if (process.env.DEEPSEEK_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" }), model: "deepseek-chat" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: "gpt-4o-mini" };
  }
  return null;
}

function parseAIJson(raw: string): any {
  const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
  if (s >= 0 && e > s) {
    try { return JSON.parse(raw.substring(s, e + 1)); } catch {}
  }
  return {};
}

export async function scanPRForVulnerabilities(
  prTitle: string, prBody: string | null, filesChanged: number, diffSample: string
): Promise<{ riskScore: number; vulnerabilities: Vulnerability[]; codeIssues: CodeIssue[]; summary: string }> {
  const ai = getAIClient();
  if (!ai) return { riskScore: 0, vulnerabilities: [], codeIssues: [], summary: "No AI key configured." };
  try {
    const c = await ai.client.chat.completions.create({
      model: ai.model, temperature: 0.1, max_tokens: 1000,
      messages: [{ role: "user", content: `Security review. Return ONLY JSON (no markdown):\nPR: ${prTitle}\nFiles: ${filesChanged}\nDiff: ${diffSample.slice(0, 5000)}\nReturn: {"riskScore":0-100,"vulnerabilities":[{"severity":"critical|high|medium|low","type":"...","description":"...","file":"...","line":0,"remediation":"..."}],"codeIssues":[{"severity":"warning","type":"...","description":"..."}],"summary":"overall assessment with actionable fixes"}` }],
    });
    const r = parseAIJson(c.choices[0]?.message?.content || "{}");
    return { riskScore: r.riskScore || 0, vulnerabilities: r.vulnerabilities || [], codeIssues: r.codeIssues || [], summary: r.summary || "Scan complete." };
  } catch { return { riskScore: 0, vulnerabilities: [], codeIssues: [], summary: "Scan unavailable." }; }
}

export async function scanDependencies(deps: { name: string; version: string }[]): Promise<{ riskScore: number; dependencyIssues: DependencyIssue[]; vulnerabilities: Vulnerability[] }> {
  const ai = getAIClient();
  if (!ai) return { riskScore: 0, dependencyIssues: [], vulnerabilities: [] };
  const list = deps.map(d => `${d.name}@${d.version}`).join(", ");
  try {
    const c = await ai.client.chat.completions.create({
      model: ai.model, temperature: 0.1, max_tokens: 1000,
      messages: [{ role: "user", content: `Scan deps for vulnerabilities. Return ONLY JSON:\nDeps: ${list}\nReturn: {"riskScore":0-100,"dependencyIssues":[{"package":"...","currentVersion":"...","latestVersion":"...","isDeprecated":false,"hasVulnerabilities":false,"license":"...","riskLevel":"low"}],"vulnerabilities":[{"id":"...","severity":"...","package":"...","version":"...","fixedVersion":"...","title":"...","description":"...","cve":"...","cvss":0}]}` }],
    });
    const r = parseAIJson(c.choices[0]?.message?.content || "{}");
    return { riskScore: r.riskScore || 0, dependencyIssues: r.dependencyIssues || [], vulnerabilities: r.vulnerabilities || [] };
  } catch { return { riskScore: 0, dependencyIssues: [], vulnerabilities: [] }; }
}

export async function fullSecurityAudit(repo: string, summary: string, deps: { name: string; version: string }[], prs: { title: string; body: string | null }[]): Promise<SecurityScanResult> {
  const depResult = await scanDependencies(deps);
  const ai = getAIClient();
  if (!ai) return { scanId: "", repoFullName: repo, scanType: "full", riskScore: depResult.riskScore, vulnerabilities: depResult.vulnerabilities, dependencyIssues: depResult.dependencyIssues, codeIssues: [], summary: "No AI key configured.", scannedAt: new Date().toISOString() };

  try {
    const c = await ai.client.chat.completions.create({
      model: ai.model, temperature: 0.2, max_tokens: 1500,
      messages: [{ role: "user", content: `Full security audit for ${repo}. Summary: ${summary}. Deps scan: ${JSON.stringify(depResult)}. Recent PRs: ${prs.length}. Return ONLY JSON:\n{"overallRiskScore":0-100,"criticalFindings":["..."],"recommendations":["..."],"summary":"comprehensive assessment with prioritized action items"}` }],
    });
    const r = parseAIJson(c.choices[0]?.message?.content || "{}");
    return { scanId: `scan_${Date.now()}`, repoFullName: repo, scanType: "full", riskScore: r.overallRiskScore || depResult.riskScore, vulnerabilities: depResult.vulnerabilities, dependencyIssues: depResult.dependencyIssues, codeIssues: [], summary: r.summary || "Audit complete.", scannedAt: new Date().toISOString() };
  } catch {
    return { scanId: `scan_${Date.now()}`, repoFullName: repo, scanType: "full", riskScore: depResult.riskScore, vulnerabilities: depResult.vulnerabilities, dependencyIssues: depResult.dependencyIssues, codeIssues: [], summary: "Security audit unavailable.", scannedAt: new Date().toISOString() };
  }
}
