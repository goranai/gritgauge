import OpenAI from "openai";
import type { SecurityScanResult, Vulnerability, DependencyIssue, CodeIssue } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function scanPRForVulnerabilities(
  prTitle: string,
  prBody: string | null,
  filesChanged: number,
  diffSample: string
): Promise<{
  riskScore: number;
  vulnerabilities: Vulnerability[];
  codeIssues: CodeIssue[];
  summary: string;
}> {
  const prompt = `You are a security expert performing a code review. Analyze this PR for security vulnerabilities.

PR Title: ${prTitle}
PR Description: ${prBody || "None"}
Files Changed: ${filesChanged}
Code Diff Sample:
\`\`\`
${diffSample.slice(0, 8000)}
\`\`\`

Identify:
1. Hardcoded secrets or API keys
2. SQL injection vulnerabilities
3. XSS vulnerabilities
4. Insecure cryptography usage
5. Missing input validation
6. Authentication/authorization issues
7. Unsafe dependency usage
8. Path traversal risks
9. Command injection risks
10. Sensitive data exposure

Return JSON:
{
  "riskScore": number (0-100),
  "vulnerabilities": [{ "severity": "critical|high|medium|low", "type": string, "description": string, "suggestion": string, "cwe": string|null }],
  "codeIssues": [{ "file": string, "line": number, "severity": "critical|high|medium|low", "rule": string, "message": string, "suggestion": string }],
  "summary": string
}
Only return valid JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    return {
      riskScore: 0,
      vulnerabilities: [],
      codeIssues: [],
      summary: "Security scan unavailable.",
    };
  }
}

export async function scanDependencies(
  dependencies: { name: string; version: string }[]
): Promise<{
  riskScore: number;
  dependencyIssues: DependencyIssue[];
  vulnerabilities: Vulnerability[];
}> {
  const depList = dependencies
    .map((d) => `${d.name}@${d.version}`)
    .join("\n");

  const prompt = `You are a dependency security auditor. Analyze these dependencies for known vulnerabilities, deprecation, and license risks.

Dependencies:
${depList}

For each dependency, check:
- Known CVEs
- Deprecation status
- License compatibility
- Version freshness

Return JSON:
{
  "riskScore": number (0-100),
  "dependencyIssues": [{ "package": string, "currentVersion": string, "latestVersion": string, "isDeprecated": boolean, "hasVulnerabilities": boolean, "license": string|null, "riskLevel": "high|medium|low" }],
  "vulnerabilities": [{ "id": string, "severity": "critical|high|medium|low", "package": string, "version": string, "fixedVersion": string|null, "title": string, "description": string, "cve": string|null, "cvss": number|null }]
}
Only return valid JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    return { riskScore: 0, dependencyIssues: [], vulnerabilities: [] };
  }
}

export async function fullSecurityAudit(
  repoName: string,
  codebaseSummary: string,
  dependencies: { name: string; version: string }[],
  recentPRs: { title: string; body: string | null }[]
): Promise<SecurityScanResult> {
  const depResult = await scanDependencies(dependencies);

  const prompt = `You are performing a comprehensive security audit of the open-source repository "${repoName}".

Codebase Summary: ${codebaseSummary}

Recent PRs (last 30 days):
${recentPRs.map((pr) => `- ${pr.title}: ${pr.body?.slice(0, 200) || "No description"}`).join("\n")}

Dependency Scan Results: ${JSON.stringify(depResult)}

Provide a final security assessment. Return JSON:
{
  "overallRiskScore": number (0-100),
  "criticalFindings": string[],
  "recommendations": string[],
  "summary": string
}
Only return valid JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const audit = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    return {
      scanId: `scan_${Date.now()}`,
      repoFullName: repoName,
      scanType: "full",
      riskScore: audit.overallRiskScore || depResult.riskScore,
      vulnerabilities: depResult.vulnerabilities,
      dependencyIssues: depResult.dependencyIssues,
      codeIssues: [],
      summary: audit.summary || "Security audit completed.",
      scannedAt: new Date().toISOString(),
    };
  } catch {
    return {
      scanId: `scan_${Date.now()}`,
      repoFullName: repoName,
      scanType: "full",
      riskScore: depResult.riskScore,
      vulnerabilities: depResult.vulnerabilities,
      dependencyIssues: depResult.dependencyIssues,
      codeIssues: [],
      summary: "Partial audit completed. AI analysis unavailable.",
      scannedAt: new Date().toISOString(),
    };
  }
}
