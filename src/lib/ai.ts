import OpenAI from "openai";
import type { TriageResult, PRReviewResult } from "@/types";

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
    const client = getOpenAI();
    if (!client) {
      return {
        issueNumber: 0,
        suggestedLabels: ["triage-needed"],
        priority: "medium",
        estimatedEffort: "medium",
        suggestedAssignee: null,
        summary: "OpenAI API key not configured.",
        isDuplicate: false,
        duplicateOf: null,
        sentiment: "neutral",
      };
    }
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    // Clean and parse: strip markdown fences, leading/trailing whitespace
    let jsonStr = content
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    // If response starts with a newline or text before JSON, find the first {
    const braceIdx = jsonStr.indexOf("{");
    if (braceIdx > 0) jsonStr = jsonStr.substring(braceIdx);
    const result = JSON.parse(jsonStr) as Partial<TriageResult>;

    return {
      issueNumber: 0, // filled by caller
      suggestedLabels: result.suggestedLabels || [],
      priority: result.priority || "medium",
      estimatedEffort: result.estimatedEffort || "medium",
      suggestedAssignee: result.suggestedAssignee || null,
      summary: result.summary || "No summary available.",
      isDuplicate: result.isDuplicate || false,
      duplicateOf: null,
      sentiment: result.sentiment || "neutral",
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
    const client2 = getOpenAI();
    if (!client2) {
      return {
        prNumber: 0,
        summary: "OpenAI API key not configured.",
        riskLevel: "medium",
        suggestedReviewers: [],
        keyChanges: [],
        potentialIssues: [],
        testCoverageNote: "N/A",
        recommendation: "comment",
      };
    }
    const completion2 = await client2.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    const content2 = completion2.choices[0]?.message?.content || "{}";
    let jsonStr2 = content2
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    const braceIdx2 = jsonStr2.indexOf("{");
    if (braceIdx2 > 0) jsonStr2 = jsonStr2.substring(braceIdx2);
    const result2 = JSON.parse(jsonStr2) as Partial<PRReviewResult>;

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
    const client3 = getOpenAI();
    if (!client3) return "Changelog generation requires OpenAI API key.";
    const completion3 = await client3.chat.completions.create({
      model: "gpt-4o-mini",
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
