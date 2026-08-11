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
