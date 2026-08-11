import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function triggerWebhooks(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<{ total: number; success: number; failed: number }> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId,
      isActive: true,
      events: { has: event },
    },
  });

  let success = 0;
  let failed = 0;

  const promises = webhooks.map(async (webhook) => {
    try {
      const body = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", webhook.secret || "")
        .update(body)
        .digest("hex");

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GritGauge-Signature": signature,
          "X-GritGauge-Event": event,
          "User-Agent": "GritGauge-Webhook/2.0",
        },
        body,
      });

      if (response.ok) {
        success++;
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { lastSentAt: new Date(), failCount: 0 },
        });
      } else {
        failed++;
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { failCount: { increment: 1 } },
        });
      }
    } catch {
      failed++;
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { failCount: { increment: 1 } },
      });
    }
  });

  await Promise.allSettled(promises);
  return { total: webhooks.length, success, failed };
}

export async function deactivateFailingWebhooks(userId: string): Promise<number> {
  const result = await prisma.webhook.updateMany({
    where: {
      userId,
      failCount: { gte: 10 },
      isActive: true,
    },
    data: { isActive: false },
  });
  return result.count;
}
