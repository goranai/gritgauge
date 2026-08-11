/**
 * Third-Party Integration Connectors
 * Slack, Discord, Jira, Linear, Microsoft Teams, Telegram, Webhook templates
 */
import prisma from "@/lib/prisma";
import { log, LogLevel } from "@/services/monitoring";

// ─── Integration Types ───

export type IntegrationProvider = "slack" | "discord" | "jira" | "linear" | "teams" | "telegram" | "custom_webhook";

export interface IntegrationConfig {
  id: string;
  provider: IntegrationProvider;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  events: string[];
  filters?: {
    repos?: string[];
    priorities?: string[];
    riskLevels?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationMessage {
  title: string;
  body: string;
  color?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  actions?: { label: string; url: string; style?: "primary" | "danger" | "default" }[];
  footer?: string;
  timestamp?: string;
}

// ─── Slack Integration ───

export async function sendSlackMessage(
  webhookUrl: string,
  message: IntegrationMessage
): Promise<boolean> {
  const colorMap: Record<string, string> = {
    critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#22c55e",
    success: "#22c55e", warning: "#f59e0b", error: "#ef4444", info: "#3b82f6",
  };

  try {
    const blocks: unknown[] = [
      {
        type: "header",
        text: { type: "plain_text", text: message.title.slice(0, 150), emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: message.body.slice(0, 3000) },
      },
    ];

    if (message.fields && message.fields.length > 0) {
      blocks.push({
        type: "section",
        fields: message.fields.slice(0, 10).map((f) => ({
          type: "mrkdwn",
          text: `*${f.name}*\n${f.value}`,
        })),
      });
    }

    if (message.actions && message.actions.length > 0) {
      blocks.push({
        type: "actions",
        elements: message.actions.slice(0, 5).map((a) => ({
          type: "button",
          text: { type: "plain_text", text: a.label },
          url: a.url,
          style: a.style || "primary",
        })),
      });
    }

    if (message.footer) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: message.footer }],
      });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color: colorMap[message.color || "info"] || "#3b82f6",
            blocks,
            footer: "⚡ GritGauge",
            ts: message.timestamp ? new Date(message.timestamp).getTime() / 1000 : undefined,
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    log(LogLevel.ERROR, "Slack integration failed", { error: String(error) });
    return false;
  }
}

// ─── Discord Integration ───

export async function sendDiscordMessage(
  webhookUrl: string,
  message: IntegrationMessage
): Promise<boolean> {
  const colorMap: Record<string, number> = {
    critical: 0xef4444, high: 0xf59e0b, medium: 0x3b82f6, low: 0x22c55e,
    success: 0x22c55e, warning: 0xf59e0b, error: 0xef4444, info: 0x3b82f6,
  };

  try {
    const embed: Record<string, unknown> = {
      title: message.title.slice(0, 256),
      description: message.body.slice(0, 4096),
      color: colorMap[message.color || "info"] || 0x3b82f6,
      timestamp: message.timestamp || new Date().toISOString(),
      footer: { text: "⚡ GritGauge" },
    };

    if (message.fields) {
      embed.fields = message.fields.slice(0, 25).map((f) => ({
        name: f.name.slice(0, 256),
        value: f.value.slice(0, 1024),
        inline: f.inline || false,
      }));
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "GritGauge",
        avatar_url: "https://gritgauge.dev/icon.png",
        embeds: [embed],
      }),
    });

    if (response.ok) return true;

    // Handle rate limits
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "5";
      await new Promise((r) => setTimeout(r, parseInt(retryAfter) * 1000));
      return sendDiscordMessage(webhookUrl, message);
    }

    return false;
  } catch (error) {
    log(LogLevel.ERROR, "Discord integration failed", { error: String(error) });
    return false;
  }
}

// ─── Microsoft Teams Integration ───

export async function sendTeamsMessage(
  webhookUrl: string,
  message: IntegrationMessage
): Promise<boolean> {
  const colorMap: Record<string, string> = {
    critical: "attention", high: "warning", medium: "accent", low: "good",
  };

  try {
    const sections: Record<string, unknown>[] = [
      {
        activityTitle: message.title,
        activitySubtitle: message.body,
        markdown: true,
      },
    ];

    if (message.fields && message.fields.length > 0) {
      sections.push({
        facts: message.fields.map((f) => ({
          name: f.name,
          value: f.value,
        })),
      });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        themeColor: colorMap[message.color || "info"] || "accent",
        summary: message.title,
        sections,
        potentialAction: message.actions?.map((a) => ({
          "@type": "OpenUri",
          name: a.label,
          targets: [{ os: "default", uri: a.url }],
        })),
      }),
    });

    return response.ok;
  } catch (error) {
    log(LogLevel.ERROR, "Teams integration failed", { error: String(error) });
    return false;
  }
}

// ─── Telegram Integration ───

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: IntegrationMessage
): Promise<boolean> {
  try {
    const text = `*${message.title}*\n\n${message.body}${message.footer ? `\n\n_${message.footer}_` : ""}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4096),
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json() as { ok: boolean };
    return data.ok === true;
  } catch (error) {
    log(LogLevel.ERROR, "Telegram integration failed", { error: String(error) });
    return false;
  }
}

// ─── Jira Integration ───

export interface JiraIssue {
  projectKey: string;
  summary: string;
  description: string;
  issueType: "Bug" | "Task" | "Story" | "Epic";
  priority: "Highest" | "High" | "Medium" | "Low" | "Lowest";
  labels?: string[];
}

export async function createJiraIssue(
  baseUrl: string,
  email: string,
  apiToken: string,
  issue: JiraIssue
): Promise<{ key: string; url: string } | null> {
  try {
    const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

    const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: issue.projectKey },
          summary: issue.summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: issue.description }],
              },
            ],
          },
          issuetype: { name: issue.issueType },
          priority: { name: issue.priority },
          labels: issue.labels || [],
        },
      }),
    });

    if (!response.ok) {
      log(LogLevel.ERROR, "Jira issue creation failed", { status: response.status });
      return null;
    }

    const data = await response.json() as { key: string; self: string };
    return {
      key: data.key,
      url: `${baseUrl}/browse/${data.key}`,
    };
  } catch (error) {
    log(LogLevel.ERROR, "Jira integration failed", { error: String(error) });
    return null;
  }
}

export async function syncIssueToJira(
  baseUrl: string,
  email: string,
  apiToken: string,
  projectKey: string,
  issueTitle: string,
  issueBody: string,
  priority: string,
  labels: string[]
): Promise<{ key: string; url: string } | null> {
  const jiraPriority =
    priority === "critical" ? "Highest" :
    priority === "high" ? "High" :
    priority === "medium" ? "Medium" : "Low";

  return createJiraIssue(baseUrl, email, apiToken, {
    projectKey,
    summary: issueTitle,
    description: issueBody || "No description provided.",
    issueType: "Task",
    priority: jiraPriority,
    labels,
  });
}

// ─── Linear Integration ───

export async function createLinearIssue(
  apiKey: string,
  teamId: string,
  title: string,
  description: string,
  priority?: number
): Promise<{ id: string; url: string } | null> {
  try {
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $priority: Int) {
            issueCreate(input: {
              title: $title,
              description: $description,
              teamId: $teamId,
              priority: $priority
            }) {
              success
              issue { id url }
            }
          }
        `,
        variables: { title, description, teamId, priority: priority || 0 },
      }),
    });

    const data = await response.json() as {
      data?: { issueCreate?: { success: boolean; issue: { id: string; url: string } } };
    };

    if (data.data?.issueCreate?.success) {
      return data.data.issueCreate.issue;
    }

    return null;
  } catch (error) {
    log(LogLevel.ERROR, "Linear integration failed", { error: String(error) });
    return null;
  }
}

// ─── Universal Message Dispatcher ───

export async function dispatchToAllIntegrations(
  userId: string,
  event: string,
  message: IntegrationMessage
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  // Get user's integration configs
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!userSettings) return results;

  const promises: Promise<void>[] = [];

  if (userSettings.slackWebhookUrl) {
    promises.push(
      sendSlackMessage(userSettings.slackWebhookUrl, message).then(
        (r) => { results.slack = r; }
      )
    );
  }

  if (userSettings.discordWebhookUrl) {
    promises.push(
      sendDiscordMessage(userSettings.discordWebhookUrl, message).then(
        (r) => { results.discord = r; }
      )
    );
  }

  await Promise.allSettled(promises);
  return results;
}

// ─── Integration Template Builder ───

export function buildTriageMessage(
  repoName: string,
  issueCount: number,
  criticalCount: number,
  highCount: number,
  dashboardUrl: string
): IntegrationMessage {
  return {
    title: `🤖 Issue Triage Complete — ${repoName}`,
    body: `AI triage analyzed *${issueCount} issues* in ${repoName}.`,
    color: criticalCount > 0 ? "critical" : highCount > 0 ? "warning" : "success",
    fields: [
      { name: "🔴 Critical", value: String(criticalCount), inline: true },
      { name: "🟠 High", value: String(highCount), inline: true },
      { name: "🟢 Medium/Low", value: String(issueCount - criticalCount - highCount), inline: true },
    ],
    actions: [{ label: "View Dashboard", url: dashboardUrl, style: "primary" }],
    footer: "⚡ GritGauge — AI Co-Pilot for Maintainers",
    timestamp: new Date().toISOString(),
  };
}

export function buildReviewMessage(
  repoName: string,
  prTitle: string,
  riskLevel: string,
  recommendation: string,
  dashboardUrl: string
): IntegrationMessage {
  return {
    title: `🔍 PR Review — ${repoName}`,
    body: `Review complete for *${prTitle}*.\n\nRisk: **${riskLevel.toUpperCase()}**\nRecommendation: **${recommendation.replace("_", " ").toUpperCase()}**`,
    color: riskLevel,
    actions: [{ label: "View Review", url: dashboardUrl, style: "primary" }],
    footer: "⚡ GritGauge AI Review",
    timestamp: new Date().toISOString(),
  };
}

export function buildSecurityAlertMessage(
  repoName: string,
  riskScore: number,
  vulnCount: number,
  dashboardUrl: string
): IntegrationMessage {
  return {
    title: `🛡️ Security Alert — ${repoName}`,
    body: `Security scan complete. Risk score: **${riskScore}/100**.\nFound *${vulnCount} potential vulnerabilities*.`,
    color: riskScore >= 70 ? "critical" : riskScore >= 40 ? "warning" : "info",
    fields: [
      { name: "Risk Score", value: `${riskScore}/100`, inline: true },
      { name: "Vulnerabilities", value: String(vulnCount), inline: true },
      { name: "Repo", value: repoName, inline: true },
    ],
    actions: [{ label: "View Security Report", url: dashboardUrl, style: "danger" }],
    footer: "⚡ GritGauge Security Scan",
    timestamp: new Date().toISOString(),
  };
}
