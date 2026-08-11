import OpenAI from "openai";
import type { TriageResult, PRReviewResult } from "@/types";

function getAI(): { client: OpenAI; model: string } | null {
  // Use DeepSeek if available, fall back to OpenAI
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" }),
      model: "deepseek-chat",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: "gpt-4o-mini",
    };
  }
  return null;
}

export async function triageIssue(
  title: string,
  body: string | null,
  existingLabels: string[]
): Promise<TriageResult> {
  const prompt = `Analyze this GitHub issue and return ONLY a JSON object (no markdown, no backticks, no other text):

Title: ${title}
Body: ${body || "No description provided."}
Current Labels: ${existingLabels.join(", ") || "None"}

The JSON object must have these exact fields:
{"suggestedLabels":["bug","ui"],"priority":"high","estimatedEffort":"small","summary":"short summary here","isDuplicate":false,"sentiment":"negative","suggestedAssignee":null}

Return ONLY the JSON object, nothing else.`;

  try {
    const ai = getAI();
    if (!ai) {
      return { issueNumber: 0, suggestedLabels: ["no-key"], priority: "medium", estimatedEffort: "medium", suggestedAssignee: null, summary: "No AI API key configured.", isDuplicate: false, duplicateOf: null, sentiment: "neutral" };
    }
    
    let raw = "";
    try {
      const completion = await ai.client.chat.completions.create({
        model: ai.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });
      raw = completion.choices[0]?.message?.content || "";
    } catch (apiErr: any) {
      return { issueNumber: 0, suggestedLabels: ["api-error"], priority: "medium", estimatedEffort: "medium", suggestedAssignee: null, summary: "AI API error: " + (apiErr?.message || "unknown"), isDuplicate: false, duplicateOf: null, sentiment: "neutral" };
    }

    // Parse whatever JSON we can find
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    let parsed: Partial<TriageResult> = {};
    if (s >= 0 && e > s) {
      try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch {}
    }
    
    return {
      issueNumber: 0,
      suggestedLabels: parsed.suggestedLabels || ["ai-processed"],
      priority: parsed.priority || "medium",
      estimatedEffort: parsed.estimatedEffort || "medium", 
      suggestedAssignee: parsed.suggestedAssignee || null,
      summary: parsed.summary || raw.substring(0, 200) || "AI returned empty response",
      isDuplicate: parsed.isDuplicate || false,
      duplicateOf: null,
      sentiment: parsed.sentiment || "neutral",
    };
  } catch (err: any) {
    console.error("[AI] triage error:", err?.message || err);
    return {
      issueNumber: 0,
      suggestedLabels: ["triage-needed"],
      priority: "medium",
      estimatedEffort: "medium",
      suggestedAssignee: null,
      summary: `AI error: ${err?.message || "unknown"}`,
      isDuplicate: false,
      duplicateOf: null,
      sentiment: "neutral",
    };
  }
}

export async function reviewPR(
  title: string,
  body: string | null,
  filesChanged: number,
  additions: number,
  deletions: number
): Promise<PRReviewResult> {
  const prompt = `You are an expert code reviewer analyzing a GitHub Pull Request. Provide a structured review.

PR Title: ${title}
PR Description: ${body || "No description provided."}
Files Changed: ${filesChanged}
Additions: +${additions}
Deletions: -${deletions}

Return a JSON object with these fields:
- summary: string (2-3 sentence summary of what this PR does)
- riskLevel: "low" | "medium" | "high"
- suggestedReviewers: string[] (suggest reviewer roles like "backend-reviewer", "security-reviewer", etc.)
- keyChanges: string[] (3-5 bullet points of key changes)
- potentialIssues: string[] (any potential problems to watch for)
- testCoverageNote: string (note about testing)
- recommendation: "approve" | "request_changes" | "comment"

Only return valid JSON, no other text.`;

  try {
    const ai = getAI();
    if (!ai) {
      return { prNumber: 0, summary: "No AI API key configured.", riskLevel: "medium", suggestedReviewers: [], keyChanges: [], potentialIssues: [], testCoverageNote: "N/A", recommendation: "comment" };
    }
    const completion2 = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    const content2 = completion2.choices[0]?.message?.content || "{}";
    const s2 = content2.indexOf("{");
    const e2 = content2.lastIndexOf("}");
    if (s2 === -1 || e2 === -1 || e2 <= s2) {
      throw new Error("No JSON found in review response");
    }
    const result2 = JSON.parse(content2.substring(s2, e2 + 1)) as Partial<PRReviewResult>;

    return {
      prNumber: 0,
      summary: result2.summary || "Unable to generate review summary.",
      riskLevel: result2.riskLevel || "medium",
      suggestedReviewers: result2.suggestedReviewers || [],
      keyChanges: result2.keyChanges || [],
      potentialIssues: result2.potentialIssues || [],
      testCoverageNote: result2.testCoverageNote || "Unable to assess test coverage.",
      recommendation: result2.recommendation || "comment",
    };
  } catch (err: any) {
    console.error("[AI] reviewPR error:", err?.message || err);
    return {
      prNumber: 0,
      summary: `AI review error: ${err?.message || "unknown"}`,
      riskLevel: "medium",
      suggestedReviewers: [],
      keyChanges: [],
      potentialIssues: [],
      testCoverageNote: "N/A",
      recommendation: "comment",
    };
  }
}

export async function generateChangelog(
  repoName: string,
  mergedPRs: { title: string; number: number; author: string }[]
): Promise<string> {
  const prList = mergedPRs
    .map((pr) => `- #${pr.number}: ${pr.title} (by @${pr.author})`)
    .join("\n");

  const prompt = `Generate a clean, professional changelog in markdown format for the following merged PRs in ${repoName}:

${prList}

Group them into:
- 🚀 Features
- 🐛 Bug Fixes
- 📚 Documentation
- 🔧 Maintenance
- ⚡ Performance

Return only the changelog in markdown format.`;

  try {
    const ai = getAI();
    if (!ai) return "Changelog generation requires an AI API key.";
    const completion3 = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return completion3.choices[0]?.message?.content || "Unable to generate changelog.";
  } catch (err: any) {
    console.error("[AI] changelog error:", err?.message || err);
    return `## Changelog\n\nGeneration error: ${err?.message || "unknown"}`;
  }
}

export async function detectDuplicateIssues(
  issues: { number: number; title: string; body: string | null }[]
): Promise<{ pairs: { issueA: number; issueB: number; similarity: string; reason: string }[]; summary: string }> {
  const ai = getAI();
  if (!ai || issues.length < 2) return { pairs: [], summary: "Need at least 2 issues to compare." };

  const issueList = issues.map(i => `#${i.number}: ${i.title}\n${(i.body || "").slice(0, 300)}`).join("\n---\n");
  const prompt = `Compare these GitHub issues and identify duplicates or highly similar pairs. Return ONLY JSON (no markdown):
  
${issueList}

Return: {"pairs":[{"issueA":number,"issueB":number,"similarity":"exact-duplicate|very-similar|related","reason":"brief explanation why"}],"summary":"overall findings summary"}`;

  try {
    const c = await ai.client.chat.completions.create({ model: ai.model, temperature: 0.1, max_tokens: 1500, messages: [{ role: "user", content: prompt }] });
    const raw = c.choices[0]?.message?.content || "{}";
    const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
    if (s >= 0 && e > s) {
      const r = JSON.parse(raw.substring(s, e + 1));
      return { pairs: r.pairs || [], summary: r.summary || "Analysis complete." };
    }
    return { pairs: [], summary: raw.substring(0, 200) };
  } catch (err: any) {
    return { pairs: [], summary: "Deduplication failed: " + (err?.message || "unknown") };
  }
}

export async function generateReleaseNotes(
  repoName: string, version: string, mergedPRs: { title: string; number: number; author: string; labels: string[] }[]
): Promise<string> {
  const ai = getAI();
  if (!ai) return "Release notes generation requires an AI API key.";

  const prList = mergedPRs.map(p => `- #${p.number}: ${p.title} (@${p.author}) [${p.labels.join(", ")}]`).join("\n");
  const prompt = `Generate professional release notes for ${repoName} v${version}. PRs:\n${prList}\n\nFormat as markdown with sections: Highlights, New Features, Bug Fixes, Improvements, Breaking Changes, Contributors. Return ONLY the release notes markdown.`;

  try {
    const c = await ai.client.chat.completions.create({ model: ai.model, temperature: 0.4, max_tokens: 2000, messages: [{ role: "user", content: prompt }] });
    return c.choices[0]?.message?.content || "Unable to generate release notes.";
  } catch (err: any) {
    return `## Release Notes\n\nGeneration error: ${err?.message || "unknown"}`;
  }
}

export async function generatePRDescription(
  diff: string, context: string
): Promise<string> {
  const ai = getAI();
  if (!ai) return "PR description generation requires an AI API key.";

  const prompt = `Generate a clear, structured PR description from this diff. Context: ${context}\n\nDiff:\n\`\`\`\n${diff.slice(0, 8000)}\n\`\`\`\n\nInclude: What changed, Why, How to test, Screenshots (if applicable), Breaking changes (if any). Return markdown.`;

  try {
    const c = await ai.client.chat.completions.create({ model: ai.model, temperature: 0.3, max_tokens: 1000, messages: [{ role: "user", content: prompt }] });
    return c.choices[0]?.message?.content || "Unable to generate PR description.";
  } catch (err: any) {
    return `## PR Description\n\nGeneration error: ${err?.message || "unknown"}`;
  }
}

export async function generateInsights(
  repoName: string, stars: number, forks: number, openIssues: number, openPRs: number,
  contributorCount: number, language: string, issues: { title: string; number: number; labels: string[] }[],
  prs: { title: string; number: number }[]
): Promise<{ benchmarks: string; predictions: string; recommendations: string[]; summary: string }> {
  const ai = getAI();
  if (!ai) return { benchmarks: "No AI key.", predictions: "", recommendations: [], summary: "" };

  const prompt = `Analyze this GitHub repo "${repoName}" (${language}, ${stars} stars, ${forks} forks, ${openIssues} issues, ${openPRs} PRs, ${contributorCount} contributors).
  
Recent issues: ${issues.slice(0,5).map(i => `#${i.number}: ${i.title}`).join("; ")}
Recent PRs: ${prs.slice(0,5).map(p => `#${p.number}: ${p.title}`).join("; ")}

Return ONLY JSON with these fields:
- benchmarks: string (how this repo compares to industry standards for ${language} projects of similar size. Include specific metrics comparison)
- predictions: string (forecast: where will this repo be in 6 months? Issue/PR trends, contributor growth)
- recommendations: string[] (5 specific, actionable recommendations to improve project health, contributor experience, and code quality)
- summary: string (one-line overall assessment)

Return: {"benchmarks":"...","predictions":"...","recommendations":["...","..."],"summary":"..."}`;

  try {
    const c = await ai.client.chat.completions.create({ model: ai.model, temperature: 0.4, max_tokens: 1500, messages: [{ role: "user", content: prompt }] });
    const raw = c.choices[0]?.message?.content || "{}";
    const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
    if (s >= 0 && e > s) {
      const r = JSON.parse(raw.substring(s, e + 1));
      return { benchmarks: r.benchmarks || "", predictions: r.predictions || "", recommendations: r.recommendations || [], summary: r.summary || "" };
    }
    return { benchmarks: raw, predictions: "", recommendations: [], summary: "" };
  } catch {
    return { benchmarks: "Analysis unavailable.", predictions: "", recommendations: [], summary: "" };
  }
}
