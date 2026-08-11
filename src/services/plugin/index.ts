/**
 * Plugin System
 * Extensible architecture allowing third-party developers to create custom integrations
 */
import prisma from "@/lib/prisma";

// ─── Plugin Types ───

export type PluginHook =
  | "onTriageComplete"
  | "onReviewComplete"
  | "onHealthSnapshot"
  | "onSecurityScan"
  | "onIssueOpened"
  | "onPROpened"
  | "onReleaseTagged"
  | "onStarReceived"
  | "beforeTriage"
  | "beforeReview"
  | "afterExport"
  | "onSchedule";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  hooks: PluginHook[];
  permissions: string[];
  configSchema?: Record<string, unknown>;
  runtime: "javascript" | "webassembly" | "http";
  entrypoint: string; // URL for HTTP plugins, code for JS plugins
}

export interface PluginContext {
  userId: string;
  repoFullName: string;
  event: string;
  payload: Record<string, unknown>;
  apiBaseUrl: string;
  apiKey?: string;
}

export interface PluginResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  actions?: PluginAction[];
}

export interface PluginAction {
  type: "create_issue" | "add_comment" | "add_label" | "send_notification" | "call_webhook" | "update_check_run";
  params: Record<string, unknown>;
}

// ─── Plugin Registry ───

const pluginRegistry = new Map<string, { manifest: PluginManifest; installed: boolean; enabled: boolean }>();

export function registerPlugin(manifest: PluginManifest): void {
  if (pluginRegistry.has(manifest.id)) {
    console.warn(`[Plugin] ${manifest.id} already registered — updating`);
  }
  pluginRegistry.set(manifest.id, {
    manifest,
    installed: true,
    enabled: true,
  });
}

export function unregisterPlugin(pluginId: string): void {
  pluginRegistry.delete(pluginId);
}

export function getPlugin(pluginId: string): PluginManifest | null {
  return pluginRegistry.get(pluginId)?.manifest || null;
}

export function listPlugins(): PluginManifest[] {
  return Array.from(pluginRegistry.values())
    .filter((p) => p.installed)
    .map((p) => p.manifest);
}

export function getPluginsForHook(hook: PluginHook): PluginManifest[] {
  return listPlugins().filter((p) => p.hooks.includes(hook) && pluginRegistry.get(p.id)?.enabled);
}

// ─── Plugin Execution Engine ───

export async function executePluginHook(
  hook: PluginHook,
  context: PluginContext
): Promise<PluginResult[]> {
  const plugins = getPluginsForHook(hook);
  if (plugins.length === 0) return [];

  const results: PluginResult[] = [];

  for (const plugin of plugins) {
    try {
      let result: PluginResult;

      switch (plugin.runtime) {
        case "http": {
          result = await executeHttpPlugin(plugin, context);
          break;
        }
        case "javascript": {
          result = await executeJavaScriptPlugin(plugin, context);
          break;
        }
        default:
          result = { success: false, error: `Unsupported runtime: ${plugin.runtime}` };
      }

      results.push(result);

      // Execute any returned actions
      if (result.actions) {
        for (const action of result.actions) {
          await executePluginAction(action, context);
        }
      }
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown plugin error",
      });
    }
  }

  return results;
}

async function executeHttpPlugin(
  plugin: PluginManifest,
  context: PluginContext
): Promise<PluginResult> {
  try {
    const response = await fetch(plugin.entrypoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Plugin-ID": plugin.id,
        "X-Plugin-Version": plugin.version,
      },
      body: JSON.stringify({
        hook: context.event,
        context: {
          userId: context.userId,
          repoFullName: context.repoFullName,
          payload: context.payload,
        },
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${await response.text()}` };
    }

    return (await response.json()) as PluginResult;
  } catch (error) {
    return { success: false, error: `HTTP plugin error: ${error}` };
  }
}

async function executeJavaScriptPlugin(
  plugin: PluginManifest,
  context: PluginContext
): Promise<PluginResult> {
  // Sandboxed JS execution — in production, use isolated-vm or Web Workers
  try {
    // For security, we validate the code and run in a restricted context
    const sandbox = {
      context,
      console: { log: () => {}, error: () => {} },
      fetch: undefined, // Block network access for JS plugins
      result: {} as PluginResult,
    };

    // Simple validation
    if (plugin.entrypoint.includes("require(") || plugin.entrypoint.includes("import ")) {
      return { success: false, error: "JS plugins cannot use require or import for security" };
    }

    // Execute in sandboxed function
    const fn = new Function("sandbox", `with(sandbox) { ${plugin.entrypoint} }`);
    fn(sandbox);

    return sandbox.result || { success: true };
  } catch (error) {
    return { success: false, error: `JS plugin error: ${error}` };
  }
}

async function executePluginAction(
  action: PluginAction,
  context: PluginContext
): Promise<void> {
  switch (action.type) {
    case "send_notification": {
      await prisma.notification.create({
        data: {
          userId: context.userId,
          type: "triage_complete",
          title: (action.params.title as string) || "Plugin notification",
          body: (action.params.body as string) || "",
          actionUrl: action.params.url as string | undefined,
        },
      });
      break;
    }
    case "call_webhook": {
      const url = action.params.url as string;
      if (url) {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.params.payload || {}),
        }).catch(() => {});
      }
      break;
    }
    default:
      console.warn(`[Plugin] Unhandled action type: ${action.type}`);
  }
}

// ─── Plugin Marketplace ───

export interface MarketplacePlugin {
  manifest: PluginManifest;
  downloads: number;
  rating: number;
  verified: boolean;
  official: boolean;
}

const marketplacePlugins: MarketplacePlugin[] = [
  {
    manifest: {
      id: "gritgauge-slack-notifier",
      name: "Slack Notifier",
      version: "1.0.0",
      description: "Sends Slack notifications on triage and review events",
      author: "GritGauge Team",
      hooks: ["onTriageComplete", "onReviewComplete", "onHealthSnapshot"],
      permissions: ["notifications", "webhooks"],
      runtime: "http",
      entrypoint: "https://plugins.gritgauge.dev/slack-notifier",
      configSchema: {
        webhookUrl: { type: "string", required: true, description: "Slack incoming webhook URL" },
        channel: { type: "string", required: false, description: "Override default channel" },
      },
    },
    downloads: 1250,
    rating: 4.7,
    verified: true,
    official: true,
  },
  {
    manifest: {
      id: "gritgauge-jira-sync",
      name: "Jira Sync",
      version: "2.1.0",
      description: "Syncs GitHub issues with Jira tickets automatically",
      author: "Community",
      hooks: ["onIssueOpened", "onTriageComplete"],
      permissions: ["issues", "external-api"],
      runtime: "http",
      entrypoint: "https://plugins.gritgauge.dev/jira-sync",
    },
    downloads: 3400,
    rating: 4.3,
    verified: true,
    official: false,
  },
  {
    manifest: {
      id: "gritgauge-changelog-ai",
      name: "AI Changelog Generator",
      version: "1.2.0",
      description: "Uses GPT-4 to generate beautiful, categorized changelogs from merged PRs",
      author: "GritGauge Team",
      hooks: ["onReleaseTagged"],
      permissions: ["ai", "exports"],
      runtime: "http",
      entrypoint: "https://plugins.gritgauge.dev/changelog-ai",
    },
    downloads: 8900,
    rating: 4.9,
    verified: true,
    official: true,
  },
  {
    manifest: {
      id: "gritgauge-discord-community",
      name: "Discord Community Bridge",
      version: "1.0.1",
      description: "Posts triage results, new issues, and releases to Discord channels",
      author: "Community",
      hooks: ["onTriageComplete", "onIssueOpened", "onReleaseTagged"],
      permissions: ["notifications"],
      runtime: "http",
      entrypoint: "https://plugins.gritgauge.dev/discord-bridge",
    },
    downloads: 2100,
    rating: 4.5,
    verified: false,
    official: false,
  },
];

export function getMarketplacePlugins(): MarketplacePlugin[] {
  return marketplacePlugins;
}

export function searchMarketplace(query: string): MarketplacePlugin[] {
  const q = query.toLowerCase();
  return marketplacePlugins.filter(
    (p) =>
      p.manifest.name.toLowerCase().includes(q) ||
      p.manifest.description.toLowerCase().includes(q) ||
      p.manifest.id.toLowerCase().includes(q)
  );
}

// ─── Plugin Installation ───

export async function installPlugin(
  userId: string,
  pluginId: string
): Promise<{ success: boolean; message: string }> {
  const marketplacePlugin = marketplacePlugins.find((p) => p.manifest.id === pluginId);
  if (!marketplacePlugin) {
    return { success: false, message: "Plugin not found in marketplace" };
  }

  if (pluginRegistry.has(pluginId)) {
    return { success: false, message: "Plugin already installed" };
  }

  registerPlugin(marketplacePlugin.manifest);

  await prisma.auditLog.create({
    data: {
      userId,
      action: "plugin.installed",
      resource: "plugin",
      resourceId: pluginId,
      metadata: { name: marketplacePlugin.manifest.name },
    },
  });

  return { success: true, message: `Plugin "${marketplacePlugin.manifest.name}" installed` };
}

export async function uninstallPlugin(userId: string, pluginId: string): Promise<{ success: boolean }> {
  unregisterPlugin(pluginId);

  await prisma.auditLog.create({
    data: {
      userId,
      action: "plugin.uninstalled",
      resource: "plugin",
      resourceId: pluginId,
    },
  });

  return { success: true };
}
