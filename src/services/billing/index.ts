/**
 * Stripe Billing Integration
 * Handles subscriptions, plans, invoices, and webhook processing
 */
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as const })
  : null;

// ─── Plan Definitions ───

export interface Plan {
  id: string;
  name: string;
  price: number; // USD per month
  features: string[];
  limits: {
    monitoredRepos: number;
    aiCallsPerDay: number;
    teamMembers: number;
    historyDays: number;
    exportFormats: string[];
    securityScans: boolean;
    prioritySupport: boolean;
    customPlugins: boolean;
    whiteLabel: boolean;
  };
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    price: 0,
    features: ["Up to 3 repos", "100 AI calls/day", "Basic analytics", "CSV export"],
    limits: {
      monitoredRepos: 3,
      aiCallsPerDay: 100,
      teamMembers: 1,
      historyDays: 30,
      exportFormats: ["csv", "json"],
      securityScans: false,
      prioritySupport: false,
      customPlugins: false,
      whiteLabel: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29,
    features: [
      "Unlimited repos",
      "1,000 AI calls/day",
      "Advanced analytics",
      "All export formats",
      "Security scans",
      "Slack/Discord notifications",
      "5 team members",
    ],
    limits: {
      monitoredRepos: Infinity,
      aiCallsPerDay: 1000,
      teamMembers: 5,
      historyDays: 365,
      exportFormats: ["csv", "json", "markdown", "pdf"],
      securityScans: true,
      prioritySupport: false,
      customPlugins: false,
      whiteLabel: false,
    },
  },
  team: {
    id: "team",
    name: "Team",
    price: 99,
    features: [
      "Everything in Pro",
      "5,000 AI calls/day",
      "20 team members",
      "Custom plugins",
      "Priority support",
      "White-label reports",
      "API access",
      "SSO",
    ],
    limits: {
      monitoredRepos: Infinity,
      aiCallsPerDay: 5000,
      teamMembers: 20,
      historyDays: Infinity,
      exportFormats: ["csv", "json", "markdown", "pdf"],
      securityScans: true,
      prioritySupport: true,
      customPlugins: true,
      whiteLabel: true,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    features: [
      "Everything in Team",
      "Unlimited AI calls",
      "Unlimited team members",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment option",
    ],
    limits: {
      monitoredRepos: Infinity,
      aiCallsPerDay: Infinity,
      teamMembers: Infinity,
      historyDays: Infinity,
      exportFormats: ["csv", "json", "markdown", "pdf"],
      securityScans: true,
      prioritySupport: true,
      customPlugins: true,
      whiteLabel: true,
    },
  },
};

// ─── Subscription Management ───

export async function getCurrentPlan(userId: string): Promise<{
  plan: Plan;
  usage: { repos: number; aiCallsToday: number; teamMembers: number };
}> {
  // Default to free plan
  let planId = "free";

  // Check if user has active subscription
  const repoCount = await prisma.savedRepo.count({ where: { userId } });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const aiCallsToday = await prisma.triageLog.count({
    where: {
      repo: { userId },
      createdAt: { gte: todayStart },
    },
  });

  const reviewCallsToday = await prisma.reviewLog.count({
    where: {
      repo: { userId },
      createdAt: { gte: todayStart },
    },
  });

  return {
    plan: PLANS[planId],
    usage: {
      repos: repoCount,
      aiCallsToday: aiCallsToday + reviewCallsToday,
      teamMembers: 1,
    },
  };
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof Plan["limits"]
): Promise<{ allowed: boolean; current: number; limit: number; plan: string }> {
  const { plan, usage } = await getCurrentPlan(userId);
  const limit = plan.limits[feature];

  let current = 0;
  switch (feature) {
    case "monitoredRepos":
      current = usage.repos;
      break;
    case "aiCallsPerDay":
      current = usage.aiCallsToday;
      break;
    case "teamMembers":
      current = usage.teamMembers;
      break;
  }

  return {
    allowed: typeof limit === "number" ? current < limit : !!limit,
    current,
    limit: typeof limit === "number" ? limit : Infinity,
    plan: plan.name,
  };
}

// ─── Stripe Checkout ───

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string | null> {
  if (!stripe) return null;

  const plan = PLANS[planId];
  if (!plan || plan.price === 0) return null;

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      client_reference_id: userId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `GritGauge ${plan.name}`,
              description: plan.features.join(", "),
            },
            unit_amount: plan.price * 100, // Stripe uses cents
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planId },
    });

    return session.url;
  } catch (error) {
    console.error("[Billing] Checkout creation failed:", error);
    return null;
  }
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) return null;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  } catch (error) {
    console.error("[Billing] Portal creation failed:", error);
    return null;
  }
}

// ─── Webhook Processing ───

export async function handleStripeWebhook(
  payload: string,
  signature: string
): Promise<{ received: boolean }> {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return { received: false };
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (userId && planId) {
          await prisma.auditLog.create({
            data: {
              userId,
              action: "billing.subscribed",
              resource: "subscription",
              resourceId: session.id,
              metadata: { planId, customerId: session.customer },
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.auditLog.create({
          data: {
            action: "billing.cancelled",
            resource: "subscription",
            resourceId: subscription.id,
            metadata: { canceledAt: subscription.canceled_at },
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await prisma.auditLog.create({
          data: {
            action: "billing.payment_failed",
            resource: "invoice",
            resourceId: invoice.id,
            metadata: { amount: invoice.amount_due, customerId: invoice.customer },
          },
        });
        break;
      }
    }

    return { received: true };
  } catch (error) {
    console.error("[Billing] Webhook error:", error);
    return { received: false };
  }
}

// ─── Usage Tracking ───

export async function trackUsage(
  userId: string,
  metric: "ai_triage" | "ai_review" | "security_scan" | "export" | "webhook_call",
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action: `usage.${metric}`,
      resource: "usage",
      resourceId: userId,
      metadata: { metric, timestamp: new Date().toISOString(), ...metadata },
    },
  });
}
