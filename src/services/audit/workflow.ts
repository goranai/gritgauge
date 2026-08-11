/**
 * Workflow Automation Engine
 * State-machine based workflow system with triggers, conditions, and actions.
 * Enables maintainers to create automated pipelines:
 *   "When issue labeled 'bug' AND priority is 'high' → assign to @maintainer AND post to Slack"
 */
import prisma from "@/lib/prisma";
import { log, LogLevel, createAlert } from "@/services/monitoring";
import { dispatchToAllIntegrations, buildTriageMessage, buildReviewMessage, buildSecurityAlertMessage } from "@/services/integrations/index";

// ─── Types ───

export type WorkflowTrigger =
  | "issue.opened"
  | "issue.labeled"
  | "issue.closed"
  | "issue.assigned"
  | "pr.opened"
  | "pr.merged"
  | "pr.closed"
  | "health.below_threshold"
  | "health.above_threshold"
  | "security.risk_detected"
  | "release.published"
  | "star.milestone"
  | "schedule.daily"
  | "schedule.weekly"
  | "manual";

export type WorkflowCondition = {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "gt" | "lt" | "gte" | "lte" | "in" | "not_in" | "regex" | "exists" | "not_exists";
  value: unknown;
};

export type WorkflowActionType =
  | "add_label"
  | "remove_label"
  | "assign_user"
  | "close_issue"
  | "reopen_issue"
  | "add_comment"
  | "lock_issue"
  | "set_milestone"
  | "send_notification"
  | "send_slack"
  | "send_discord"
  | "send_email"
  | "call_webhook"
  | "run_triage"
  | "run_review"
  | "run_security_scan"
  | "create_report"
  | "wait"
  | "condition";

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  params: Record<string, unknown>;
  delay?: number; // milliseconds
  condition?: WorkflowCondition[];
  onError?: "skip" | "stop" | "retry";
  maxRetries?: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  actions: WorkflowAction[];
  timeout?: number;
  onTimeout?: "skip" | "fail";
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  triggerConfig?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  runCount: number;
  errorCount: number;
}

// ─── Condition Evaluator ───

export function evaluateCondition(
  condition: WorkflowCondition,
  context: Record<string, unknown>
): boolean {
  const fieldValue = resolveFieldPath(condition.field, context);
  const expectedValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return fieldValue === expectedValue;
    case "not_equals":
      return fieldValue !== expectedValue;
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case "not_contains":
      return !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case "gt":
      return Number(fieldValue) > Number(expectedValue);
    case "lt":
      return Number(fieldValue) < Number(expectedValue);
    case "gte":
      return Number(fieldValue) >= Number(expectedValue);
    case "lte":
      return Number(fieldValue) <= Number(expectedValue);
    case "in":
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
    case "not_in":
      return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
    case "regex":
      try {
        return new RegExp(String(expectedValue)).test(String(fieldValue));
      } catch {
        return false;
      }
    case "exists":
      return fieldValue !== undefined && fieldValue !== null;
    case "not_exists":
      return fieldValue === undefined || fieldValue === null;
    default:
      return false;
  }
}

export function evaluateConditions(
  conditions: WorkflowCondition[],
  context: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, context));
}

function resolveFieldPath(path: string, obj: Record<string, unknown>): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ─── Workflow Registry ───

const workflowRegistry = new Map<string, WorkflowDefinition>();

export function registerWorkflow(workflow: WorkflowDefinition): void {
  workflowRegistry.set(workflow.id, workflow);
  log(LogLevel.INFO, `Workflow registered: ${workflow.name}`);
}

export function unregisterWorkflow(id: string): void {
  workflowRegistry.delete(id);
}

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return workflowRegistry.get(id);
}

export function listWorkflows(): WorkflowDefinition[] {
  return Array.from(workflowRegistry.values());
}

export function getWorkflowsByTrigger(trigger: WorkflowTrigger): WorkflowDefinition[] {
  return listWorkflows().filter((w) => w.trigger === trigger && w.enabled);
}

// ─── Action Executor ───

export async function executeAction(
  action: WorkflowAction,
  context: Record<string, unknown>
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  const execute = async (attempt: number): Promise<{ success: boolean; output?: unknown; error?: string }> => {
    try {
      switch (action.type) {
        case "add_label": {
          const label = action.params.label as string;
          log(LogLevel.INFO, `Workflow: add_label "${label}"`, { context: { issue: context.issueNumber } });
          return { success: true, output: { label } };
        }

        case "assign_user": {
          const user = action.params.user as string;
          log(LogLevel.INFO, `Workflow: assign_user "${user}"`);
          return { success: true, output: { user } };
        }

        case "close_issue": {
          log(LogLevel.INFO, "Workflow: close_issue");
          return { success: true };
        }

        case "add_comment": {
          const comment = action.params.comment as string;
          log(LogLevel.INFO, `Workflow: add_comment "${comment.slice(0, 50)}..."`);
          return { success: true };
        }

        case "send_notification": {
          const userId = action.params.userId as string;
          const title = action.params.title as string;
          const body = action.params.body as string;

          await prisma.notification.create({
            data: {
              userId: userId || (context.userId as string) || "system",
              type: "triage_complete",
              title: interpolateTemplate(title, context),
              body: interpolateTemplate(body, context),
              actionUrl: action.params.url as string | undefined,
            },
          });
          return { success: true };
        }

        case "send_slack": {
          const webhookUrl = action.params.webhookUrl as string;
          const message = buildTriageMessage(
            (context.repoFullName as string) || "unknown",
            (context.issueCount as number) || 0,
            (context.criticalCount as number) || 0,
            (context.highCount as number) || 0,
            (context.dashboardUrl as string) || "#"
          );
          const { sendSlackMessage } = await import("@/services/integrations/index");
          const ok = await sendSlackMessage(webhookUrl, message);
          return { success: ok };
        }

        case "call_webhook": {
          const url = action.params.url as string;
          const method = (action.params.method as string) || "POST";
          const headers = (action.params.headers as Record<string, string>) || {};
          const body = action.params.body || context;

          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", ...headers },
            body: method !== "GET" ? JSON.stringify(body) : undefined,
          });

          return { success: response.ok, output: await response.json().catch(() => ({})) };
        }

        case "wait": {
          const duration = action.params.duration as number || 1000;
          await new Promise((r) => setTimeout(r, duration));
          return { success: true };
        }

        case "condition": {
          if (action.condition) {
            const result = evaluateConditions(action.condition, context);
            return { success: true, output: { conditionResult: result } };
          }
          return { success: true };
        }

        case "run_triage": {
          log(LogLevel.INFO, "Workflow: run_triage triggered");
          return { success: true, output: { triaged: true } };
        }

        case "run_review": {
          log(LogLevel.INFO, "Workflow: run_review triggered");
          return { success: true, output: { reviewed: true } };
        }

        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      log(LogLevel.ERROR, `Workflow action ${action.type} failed`, { error: msg });

      if (action.onError === "retry" && attempt < (action.maxRetries || 3)) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
        return execute(attempt + 1);
      }

      if (action.onError === "stop") {
        throw error;
      }

      return { success: false, error: msg };
    }
  };

  return execute(0);
}

// ─── Workflow Executor ───

export interface WorkflowExecutionContext {
  userId?: string;
  repoFullName?: string;
  issueNumber?: number;
  prNumber?: number;
  event?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function executeWorkflow(
  workflowId: string,
  context: WorkflowExecutionContext
): Promise<{
  success: boolean;
  workflowName: string;
  stepsExecuted: number;
  actionsExecuted: number;
  errors: string[];
  durationMs: number;
}> {
  const workflow = workflowRegistry.get(workflowId);
  if (!workflow) {
    return { success: false, workflowName: "unknown", stepsExecuted: 0, actionsExecuted: 0, errors: ["Workflow not found"], durationMs: 0 };
  }

  if (!workflow.enabled) {
    return { success: false, workflowName: workflow.name, stepsExecuted: 0, actionsExecuted: 0, errors: ["Workflow disabled"], durationMs: 0 };
  }

  // Check conditions
  if (workflow.conditions && !evaluateConditions(workflow.conditions, context)) {
    return { success: true, workflowName: workflow.name, stepsExecuted: 0, actionsExecuted: 0, errors: [], durationMs: 0 };
  }

  const startTime = Date.now();
  let stepsExecuted = 0;
  let actionsExecuted = 0;
  const errors: string[] = [];

  for (const step of workflow.steps) {
    stepsExecuted++;

    for (const action of step.actions) {
      // Check action-level conditions
      if (action.condition && !evaluateConditions(action.condition, context)) {
        continue;
      }

      // Apply delay
      if (action.delay) {
        await new Promise((r) => setTimeout(r, action.delay));
      }

      const result = await executeAction(action, context);
      actionsExecuted++;

      if (!result.success) {
        errors.push(`Step "${step.name}" / Action "${action.type}": ${result.error}`);
        if (action.onError === "stop") {
          break;
        }
      }

      // Merge action output into context for subsequent actions
      if (result.output) {
        context = { ...context, ...(result.output as Record<string, unknown>) };
      }
    }
  }

  const durationMs = Date.now() - startTime;

  // Update workflow stats
  workflow.runCount++;
  workflow.lastRunAt = new Date();
  if (errors.length > 0) workflow.errorCount++;

  if (errors.length > 0) {
    createAlert("warning", "workflow", `Workflow "${workflow.name}" completed with ${errors.length} errors`);
  }

  return {
    success: errors.length === 0,
    workflowName: workflow.name,
    stepsExecuted,
    actionsExecuted,
    errors,
    durationMs,
  };
}

// ─── Trigger Dispatcher ───

export async function dispatchTrigger(
  trigger: WorkflowTrigger,
  context: WorkflowExecutionContext
): Promise<{ workflowsTriggered: number; results: { name: string; success: boolean }[] }> {
  const workflows = getWorkflowsByTrigger(trigger);
  const results: { name: string; success: boolean }[] = [];

  for (const workflow of workflows) {
    const result = await executeWorkflow(workflow.id, context);
    results.push({ name: workflow.name, success: result.success });
  }

  return { workflowsTriggered: workflows.length, results };
}

// ─── Template Engine ───

function interpolateTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
    const value = resolveFieldPath(path, context);
    return value !== undefined ? String(value) : `{{${path}}}`;
  });
}

// ─── Built-in Workflow Templates ───

export const BUILTIN_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "auto-triage-critical",
    name: "Auto-Triage Critical Issues",
    description: "When a new issue is opened, run AI triage and notify if critical",
    enabled: false,
    trigger: "issue.opened",
    conditions: [],
    steps: [
      {
        id: "step-1",
        name: "Triage and Notify",
        actions: [
          { id: "act-1", type: "run_triage", params: {} },
          {
            id: "act-2",
            type: "condition",
            params: {},
            condition: [{ field: "priority", operator: "equals", value: "critical" }],
          },
          {
            id: "act-3",
            type: "send_notification",
            params: {
              title: "🚨 Critical Issue Detected",
              body: "Issue #{{issueNumber}} has been flagged as critical: {{issueTitle}}",
              userId: "{{userId}}",
            },
          },
          {
            id: "act-4",
            type: "add_label",
            params: { label: "critical" },
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    runCount: 0,
    errorCount: 0,
  },
  {
    id: "auto-review-high-risk",
    name: "Auto-Review High Risk PRs",
    description: "Run AI review on all new PRs and flag high-risk ones",
    enabled: false,
    trigger: "pr.opened",
    conditions: [],
    steps: [
      {
        id: "step-1",
        name: "Review and Flag",
        actions: [
          { id: "act-1", type: "run_review", params: {} },
          {
            id: "act-2",
            type: "condition",
            params: {},
            condition: [{ field: "riskLevel", operator: "equals", value: "high" }],
          },
          {
            id: "act-3",
            type: "send_slack",
            params: {
              webhookUrl: "",
            },
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    runCount: 0,
    errorCount: 0,
  },
  {
    id: "stale-issue-cleanup",
    name: "Stale Issue Cleanup",
    description: "Label and close issues inactive for 90+ days",
    enabled: false,
    trigger: "schedule.weekly",
    conditions: [],
    steps: [
      {
        id: "step-1",
        name: "Find and Label Stale Issues",
        actions: [
          {
            id: "act-1",
            type: "condition",
            params: {},
            condition: [
              { field: "daysSinceUpdate", operator: "gte", value: 90 },
              { field: "state", operator: "equals", value: "open" },
            ],
          },
          { id: "act-2", type: "add_label", params: { label: "stale" } },
          {
            id: "act-3",
            type: "add_comment",
            params: {
              comment: "This issue has been marked as stale due to 90+ days of inactivity. It will be closed in 7 days if no further activity occurs.",
            },
          },
        ],
      },
      {
        id: "step-2",
        name: "Close Stale Issues",
        actions: [
          {
            id: "act-4",
            type: "condition",
            params: {},
            condition: [
              { field: "daysSinceStaleLabel", operator: "gte", value: 7 },
            ],
          },
          { id: "act-5", type: "close_issue", params: {} },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    runCount: 0,
    errorCount: 0,
  },
  {
    id: "health-alert",
    name: "Health Score Alert",
    description: "Send alerts when project health drops below threshold",
    enabled: false,
    trigger: "health.below_threshold",
    triggerConfig: { threshold: 40 },
    conditions: [],
    steps: [
      {
        id: "step-1",
        name: "Alert Maintainers",
        actions: [
          {
            id: "act-1",
            type: "send_notification",
            params: {
              title: "📉 Health Score Alert",
              body: "{{repoFullName}} health score dropped to {{healthScore}}/100. Immediate attention needed.",
              userId: "{{userId}}",
            },
          },
          {
            id: "act-2",
            type: "send_slack",
            params: {
              webhookUrl: "",
            },
          },
          {
            id: "act-3",
            type: "create_report",
            params: { reportType: "health", format: "markdown" },
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    runCount: 0,
    errorCount: 0,
  },
  {
    id: "release-changelog",
    name: "Auto-Generate Release Changelog",
    description: "When a release is published, auto-generate a changelog",
    enabled: false,
    trigger: "release.published",
    conditions: [],
    steps: [
      {
        id: "step-1",
        name: "Generate Changelog",
        actions: [
          {
            id: "act-1",
            type: "call_webhook",
            params: {
              url: "{{apiBaseUrl}}/api/export",
              method: "POST",
              body: {
                type: "activity",
                format: "markdown",
                title: "Changelog {{releaseTag}}",
              },
            },
          },
          {
            id: "act-2",
            type: "send_notification",
            params: {
              title: "📝 Changelog Generated",
              body: "Changelog for {{releaseTag}} has been auto-generated.",
              userId: "{{userId}}",
            },
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    runCount: 0,
    errorCount: 0,
  },
];
