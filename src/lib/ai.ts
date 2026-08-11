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
  const prompt = `You are an expert open-source maintainer triaging a GitHub issue. Analyze the following issue and provide a structured triage assessment.

Title: ${title}
Body: ${body || "No description provided."}
Current Labels: ${existingLabels.join(", ") || "None"}

Return a JSON object with these fields:
- suggestedLabels: string[] (3-5 relevant labels like "bug", "enhancement", "documentation", "good first issue", "help wanted", etc.)
- priority: "critical" | "high" | "medium" | "low"
- estimatedEffort: "small" | "medium" | "large"
- summary: string (one-sentence summary of the issue)
- isDuplicate: boolean
- sentiment: "positive" | "neutral" | "negative"
- suggestedAssignee: string | null (suggest "any-maintainer" if no specific person)

Only return valid JSON, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    // Extract JSON from potential markdown code block
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : content) as Partial<TriageResult>;

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
  } catch {
    return {
      issueNumber: 0,
      suggestedLabels: ["triage-needed"],
      priority: "medium",
      estimatedEffort: "medium",
      suggestedAssignee: null,
      summary: "AI triage unavailable — manual review needed.",
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
    const jsonMatch2 = content2.match(/\{[\s\S]*\}/);
    const result2 = JSON.parse(jsonMatch2 ? jsonMatch2[0] : content2) as Partial<PRReviewResult>;

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
  } catch {
    return {
      prNumber: 0,
      summary: "AI review unavailable — manual review needed.",
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
  } catch {
    return "## Changelog\n\nUnable to generate changelog automatically.";
  }
}
