import { Resend } from "resend";
import type { NotificationPayload } from "@/types";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendEmailNotification(
  to: string,
  payload: NotificationPayload
): Promise<boolean> {
  if (!resend) {
    console.warn("[Notifications] Resend not configured — email skipped");
    return false;
  }

  try {
    await resend.emails.send({
      from: "GritGauge <notifications@gritgauge.dev>",
      to,
      subject: `[GritGauge] ${payload.title}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">GritGauge Notification</h2>
          <h3>${payload.title}</h3>
          <p>${payload.body}</p>
          ${payload.actionUrl ? `<a href="${payload.actionUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Details</a>` : ""}
          <hr style="margin-top: 24px; border-color: #e2e8f0;" />
          <p style="color: #64748b; font-size: 12px;">Sent by GritGauge — your AI co-pilot for open-source maintenance.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("[Notifications] Email send failed:", error);
    return false;
  }
}

export async function sendSlackNotification(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*${payload.title}*\n${payload.body}`,
        attachments: payload.actionUrl
          ? [
              {
                fallback: "View details",
                actions: [
                  {
                    type: "button",
                    text: "View Details",
                    url: payload.actionUrl,
                  },
                ],
              },
            ]
          : [],
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[Notifications] Slack send failed:", error);
    return false;
  }
}

export async function sendDiscordNotification(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: payload.title,
            description: payload.body,
            color: 0x16a34a,
            url: payload.actionUrl,
            timestamp: new Date().toISOString(),
            footer: { text: "GritGauge Notification" },
          },
        ],
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[Notifications] Discord send failed:", error);
    return false;
  }
}

export async function dispatchNotification(
  email: string | null,
  slackUrl: string | null,
  discordUrl: string | null,
  payload: NotificationPayload
): Promise<{ email: boolean; slack: boolean; discord: boolean }> {
  const results = { email: false, slack: false, discord: false };

  const promises: Promise<void>[] = [];

  if (email) {
    promises.push(
      sendEmailNotification(email, payload).then((r) => {
        results.email = r;
      })
    );
  }
  if (slackUrl) {
    promises.push(
      sendSlackNotification(slackUrl, payload).then((r) => {
        results.slack = r;
      })
    );
  }
  if (discordUrl) {
    promises.push(
      sendDiscordNotification(discordUrl, payload).then((r) => {
        results.discord = r;
      })
    );
  }

  await Promise.allSettled(promises);
  return results;
}
