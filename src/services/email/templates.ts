/**
 * Email Template System
 * Professional HTML email templates for all notification types
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ─── Base Template ───

function baseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">⚡ GritGauge</h1>
              <p style="color:#bbf7d0;margin:8px 0 0;font-size:14px;">AI Co-Pilot for Open Source Maintainers</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0;">
                Sent by GritGauge — your AI co-pilot for open-source maintenance.<br/>
                <a href="https://gritgauge.dev/unsubscribe" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> ·
                <a href="https://gritgauge.dev/settings" style="color:#94a3b8;text-decoration:underline;">Notification Settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Specific Email Templates ───

export function triageCompleteEmail(
  repoName: string,
  issueCount: number,
  criticalCount: number,
  highCount: number,
  details: { number: number; title: string; priority: string }[],
  dashboardUrl: string
): string {
  const issueList = details
    .slice(0, 5)
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #334155;">
        <span style="color:#${i.priority === "critical" ? "ef4444" : i.priority === "high" ? "f59e0b" : "3b82f6"};font-weight:600;">#${i.number}</span>
        <span style="color:#e2e8f0;margin-left:8px;">${i.title.slice(0, 80)}</span>
        <span style="color:#64748b;font-size:12px;margin-left:8px;">[${i.priority}]</span>
      </td>
    </tr>`
    )
    .join("");

  const content = `
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">🤖 Issue Triage Complete</h2>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">
      AI triage completed for <strong style="color:#ffffff;">${repoName}</strong>.
      ${issueCount} issues analyzed.
    </p>

    <!-- Stats -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#ef444410;border:1px solid #ef444420;border-radius:8px;padding:12px;text-align:center;width:25%;">
          <div style="color:#ef4444;font-size:24px;font-weight:700;">${criticalCount}</div>
          <div style="color:#fca5a5;font-size:12px;">Critical</div>
        </td>
        <td width="8"></td>
        <td style="background:#f59e0b10;border:1px solid #f59e0b20;border-radius:8px;padding:12px;text-align:center;width:25%;">
          <div style="color:#f59e0b;font-size:24px;font-weight:700;">${highCount}</div>
          <div style="color:#fcd34d;font-size:12px;">High</div>
        </td>
        <td width="8"></td>
        <td style="background:#22c55e10;border:1px solid #22c55e20;border-radius:8px;padding:12px;text-align:center;width:50%;">
          <div style="color:#22c55e;font-size:24px;font-weight:700;">${issueCount - criticalCount - highCount}</div>
          <div style="color:#86efac;font-size:12px;">Medium / Low</div>
        </td>
      </tr>
    </table>

    <!-- Issue List -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${issueList}
      ${details.length > 5 ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">...and ${details.length - 5} more issues</td></tr>` : ""}
    </table>

    <!-- CTA -->
    <a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
      View All Issues →
    </a>
  `;

  return baseTemplate(content, `Issue Triage Complete — ${repoName}`);
}

export function reviewCompleteEmail(
  repoName: string,
  prTitle: string,
  riskLevel: string,
  recommendation: string,
  summary: string,
  dashboardUrl: string
): string {
  const riskColor = riskLevel === "high" ? "#ef4444" : riskLevel === "medium" ? "#f59e0b" : "#22c55e";
  const recColor = recommendation === "approve" ? "#22c55e" : recommendation === "request_changes" ? "#ef4444" : "#f59e0b";

  const content = `
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">🔍 PR Review Complete</h2>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 16px;">
      AI review completed for a pull request in <strong style="color:#ffffff;">${repoName}</strong>.
    </p>

    <!-- PR Info -->
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="color:#ffffff;font-weight:600;margin:0 0 8px;">${prTitle}</p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:16px;"><span style="color:#64748b;font-size:13px;">Risk:</span> <span style="color:${riskColor};font-weight:600;font-size:13px;">${riskLevel.toUpperCase()}</span></td>
          <td><span style="color:#64748b;font-size:13px;">Recommendation:</span> <span style="color:${recColor};font-weight:600;font-size:13px;">${recommendation.replace("_", " ").toUpperCase()}</span></td>
        </tr>
      </table>
    </div>

    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">${summary}</p>

    <a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
      View Full Review →
    </a>
  `;

  return baseTemplate(content, `PR Review — ${prTitle}`);
}

export function healthAlertEmail(
  repoName: string,
  healthScore: number,
  previousScore: number,
  alerts: string[],
  dashboardUrl: string
): string {
  const trend = healthScore >= previousScore ? "improving" : "declining";
  const trendColor = trend === "improving" ? "#22c55e" : "#ef4444";

  const alertList = alerts
    .map((a) => `<li style="color:#fca5a5;font-size:14px;margin-bottom:4px;">⚠️ ${a}</li>`)
    .join("");

  const content = `
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">📊 Health Alert</h2>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Health check completed for <strong style="color:#ffffff;">${repoName}</strong>.
    </p>

    <!-- Score -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;font-weight:700;color:${trendColor};">${healthScore}<span style="font-size:20px;color:#64748b;">/100</span></div>
      <div style="color:#64748b;font-size:13px;margin-top:4px;">Health is ${trend} (was ${previousScore})</div>
    </div>

    ${alerts.length > 0 ? `
    <div style="background:#ef444410;border:1px solid #ef444420;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="color:#fca5a5;font-weight:600;font-size:14px;margin:0 0 8px;">Issues Detected:</p>
      <ul style="margin:0;padding-left:20px;">${alertList}</ul>
    </div>
    ` : ""}

    <a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
      View Health Dashboard →
    </a>
  `;

  return baseTemplate(content, `Health Alert — ${repoName}`);
}

export function securityAlertEmail(
  repoName: string,
  riskScore: number,
  vulnerabilities: { severity: string; description: string }[],
  dashboardUrl: string
): string {
  const vulnList = vulnerabilities
    .slice(0, 5)
    .map(
      (v) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #334155;">
        <span style="color:#${v.severity === "critical" ? "ef4444" : v.severity === "high" ? "f59e0b" : "3b82f6"};font-weight:600;font-size:12px;">[${v.severity.toUpperCase()}]</span>
        <span style="color:#e2e8f0;font-size:13px;margin-left:8px;">${v.description.slice(0, 100)}</span>
      </td>
    </tr>`
    )
    .join("");

  const content = `
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">🛡️ Security Alert</h2>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Security scan completed for <strong style="color:#ffffff;">${repoName}</strong>.
    </p>

    <!-- Risk Score -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;font-weight:700;color:#${riskScore >= 70 ? "ef4444" : riskScore >= 40 ? "f59e0b" : "22c55e"};">${riskScore}<span style="font-size:20px;color:#64748b;">/100</span></div>
      <div style="color:#64748b;font-size:13px;margin-top:4px;">Risk Score</div>
    </div>

    ${vulnerabilities.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${vulnList}
    </table>
    ` : ""}

    <a href="${dashboardUrl}" style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
      View Security Report →
    </a>
  `;

  return baseTemplate(content, `Security Alert — ${repoName}`);
}

export function welcomeEmail(userName: string, dashboardUrl: string): string {
  const content = `
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">Welcome to GritGauge, ${userName}! 🚀</h2>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">
      You're all set! GritGauge is now monitoring your open-source projects with AI-powered
      issue triage, PR reviews, and health analytics.
    </p>

    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="color:#ffffff;font-weight:600;margin:0 0 8px;">Quick Start:</p>
      <ol style="color:#cbd5e1;font-size:14px;margin:0;padding-left:20px;">
        <li style="margin-bottom:4px;">Connect a GitHub repository</li>
        <li style="margin-bottom:4px;">Run your first AI triage</li>
        <li style="margin-bottom:4px;">Review your project's health score</li>
        <li>Set up notifications for your team</li>
      </ol>
    </div>

    <a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
      Go to Dashboard →
    </a>
  `;

  return baseTemplate(content, "Welcome to GritGauge!");
}

// ─── Email Sending ───

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured");
    return { success: false };
  }

  try {
    const result = await resend.emails.send({
      from: "GritGauge <notifications@gritgauge.dev>",
      to,
      subject,
      html,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("[Email] Send failed:", error);
    return { success: false };
  }
}
