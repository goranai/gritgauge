/**
 * GritGauge VS Code Extension — Main Entry Point
 * Provides AI-powered maintainer tools directly in the editor
 */
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// ─── State ───

interface ExtensionState {
  currentRepo: string | null;
  healthScore: number | null;
  lastRefresh: number;
  issues: IssueItem[];
  pullRequests: PRIItem[];
}

interface IssueItem {
  number: number;
  title: string;
  state: string;
  labels: string[];
  priority: string;
  url: string;
}

interface PRIItem {
  number: number;
  title: string;
  state: string;
  riskLevel: string;
  recommendation: string;
  url: string;
}

let state: ExtensionState = {
  currentRepo: null,
  healthScore: null,
  lastRefresh: 0,
  issues: [],
  pullRequests: [],
};

let statusBarItem: vscode.StatusBarItem;
let issueTreeProvider: IssueTreeProvider;
let prTreeProvider: PRTreeProvider;
let dashboardProvider: DashboardProvider;

// ─── Activation ───

export function activate(context: vscode.ExtensionContext) {
  console.log("GritGauge extension activated");

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = "gritgauge.openDashboard";
  statusBarItem.text = "$(pulse) GritGauge";
  statusBarItem.tooltip = "Open GritGauge Dashboard";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Tree providers
  issueTreeProvider = new IssueTreeProvider();
  prTreeProvider = new PRTreeProvider();
  dashboardProvider = new DashboardProvider();

  vscode.window.registerTreeDataProvider("gritgauge.issues", issueTreeProvider);
  vscode.window.registerTreeDataProvider("gritgauge.pullRequests", prTreeProvider);
  vscode.window.registerTreeDataProvider("gritgauge.dashboard", dashboardProvider);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("gritgauge.triageIssue", triageIssueCommand),
    vscode.commands.registerCommand("gritgauge.reviewPR", reviewPRCommand),
    vscode.commands.registerCommand("gritgauge.checkHealth", checkHealthCommand),
    vscode.commands.registerCommand("gritgauge.openDashboard", openDashboardCommand),
    vscode.commands.registerCommand("gritgauge.scanSecurity", scanSecurityCommand),
    vscode.commands.registerCommand("gritgauge.generateChangelog", generateChangelogCommand),
    vscode.commands.registerCommand("gritgauge.addRepo", addRepoCommand),
    vscode.commands.registerCommand("gritgauge.refresh", refreshCommand)
  );

  // Auto-detect repo
  detectCurrentRepo();
}

// ─── Deactivation ───

export function deactivate() {
  console.log("GritGauge extension deactivated");
}

// ─── Git Repo Detection ───

async function detectCurrentRepo(): Promise<void> {
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) return;

  const git = gitExtension.exports.getAPI(1);
  const repos = git.repositories;

  if (repos.length > 0) {
    const remote = repos[0].state.remotes[0];
    if (remote?.fetchUrl) {
      const match = remote.fetchUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        state.currentRepo = `${match[1]}/${match[2]}`;
        vscode.window.showInformationMessage(`GritGauge: Connected to ${state.currentRepo}`);
        refreshCommand();
      }
    }
  }
}

// ─── Commands ───

async function triageIssueCommand(): Promise<void> {
  if (!state.currentRepo) {
    vscode.window.showWarningMessage("No GitHub repository detected. Use 'Add Repository' first.");
    return;
  }

  const progress = vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Running AI Triage..." },
    async () => {
      try {
        const apiUrl = vscode.workspace.getConfiguration("gritgauge").get<string>("apiUrl") || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/api/github?repo=${encodeURIComponent(state.currentRepo!)}`);

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json() as { issues: IssueItem[] };
        state.issues = data.issues || [];
        issueTreeProvider.refresh();

        vscode.window.showInformationMessage(
          `GritGauge: Triaged ${state.issues.length} issues in ${state.currentRepo}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Triage failed: ${error}`);
      }
    }
  );
}

async function reviewPRCommand(): Promise<void> {
  if (!state.currentRepo) {
    vscode.window.showWarningMessage("No GitHub repository detected.");
    return;
  }

  const progress = vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Running AI PR Review..." },
    async () => {
      try {
        const apiUrl = vscode.workspace.getConfiguration("gritgauge").get<string>("apiUrl") || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/api/github?repo=${encodeURIComponent(state.currentRepo!)}`);

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json() as { pullRequests: PRIItem[] };
        state.pullRequests = data.pullRequests || [];
        prTreeProvider.refresh();

        const highRisk = state.pullRequests.filter((pr) => pr.riskLevel === "high");
        if (highRisk.length > 0) {
          vscode.window.showWarningMessage(
            `GritGauge: ${highRisk.length} high-risk PRs found in ${state.currentRepo}`
          );
        } else {
          vscode.window.showInformationMessage(
            `GritGauge: Reviewed ${state.pullRequests.length} PRs`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`PR review failed: ${error}`);
      }
    }
  );
}

async function checkHealthCommand(): Promise<void> {
  if (!state.currentRepo) return;

  const progress = vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Analyzing project health..." },
    async () => {
      try {
        const apiUrl = vscode.workspace.getConfiguration("gritgauge").get<string>("apiUrl") || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/api/analytics?repoId=${encodeURIComponent(state.currentRepo!)}`);

        if (response.ok) {
          const data = await response.json() as { data: { healthScore: number } };
          state.healthScore = data.data?.healthScore || 0;

          statusBarItem.text = `$(pulse) Health: ${state.healthScore}/100`;

          const scoreColor = state.healthScore >= 70 ? "✅" : state.healthScore >= 40 ? "⚠️" : "🔴";
          vscode.window.showInformationMessage(
            `${scoreColor} ${state.currentRepo} Health Score: ${state.healthScore}/100`
          );

          dashboardProvider.refresh();
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Health check failed: ${error}`);
      }
    }
  );
}

async function openDashboardCommand(): Promise<void> {
  const apiUrl = vscode.workspace.getConfiguration("gritgauge").get<string>("apiUrl") || "http://localhost:3000";
  const dashboardUrl = state.currentRepo
    ? `${apiUrl}/dashboard?repo=${encodeURIComponent(state.currentRepo)}`
    : `${apiUrl}`;

  vscode.env.openExternal(vscode.Uri.parse(dashboardUrl));
}

async function scanSecurityCommand(): Promise<void> {
  if (!state.currentRepo) {
    vscode.window.showWarningMessage("No repository detected.");
    return;
  }

  const progress = vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Running security scan..." },
    async () => {
      try {
        const apiUrl = vscode.workspace.getConfiguration("gritgauge").get<string>("apiUrl") || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/api/security`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo: state.currentRepo, scanType: "full" }),
        });

        if (response.ok) {
          const data = await response.json() as { data: { riskScore: number } };
          const riskScore = data.data?.riskScore || 0;

          const riskColor = riskScore >= 70 ? "🔴" : riskScore >= 40 ? "🟡" : "🟢";
          vscode.window.showInformationMessage(
            `${riskColor} Security Risk Score: ${riskScore}/100 for ${state.currentRepo}`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Security scan failed: ${error}`);
      }
    }
  );
}

async function generateChangelogCommand(): Promise<void> {
  const version = await vscode.window.showInputBox({
    prompt: "Enter version tag (e.g., v2.0.0)",
    placeHolder: "v2.0.0",
  });

  if (!version || !state.currentRepo) return;

  const progress = vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Generating changelog..." },
    async () => {
      try {
        const apiUrl = vscode.workspace.getConfiguration("gritgauge").get<string>("apiUrl") || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/api/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "activity",
            format: "markdown",
            title: `Changelog ${version}`,
          }),
        });

        if (response.ok) {
          const changelog = await response.text();

          // Save to file
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders) {
            const filePath = path.join(workspaceFolders[0].uri.fsPath, `CHANGELOG_${version}.md`);
            fs.writeFileSync(filePath, changelog, "utf-8");

            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(`Changelog saved to CHANGELOG_${version}.md`);
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Changelog generation failed: ${error}`);
      }
    }
  );
}

async function addRepoCommand(): Promise<void> {
  const repoUrl = await vscode.window.showInputBox({
    prompt: "Enter GitHub repository (owner/repo or full URL)",
    placeHolder: "facebook/react",
  });

  if (repoUrl) {
    const match = repoUrl.match(/(?:github\.com\/)?([^/]+)\/([^/]+)/);
    if (match) {
      state.currentRepo = `${match[1]}/${match[2]}`;
      vscode.window.showInformationMessage(`GritGauge: Added ${state.currentRepo}`);
      refreshCommand();
    } else {
      vscode.window.showErrorMessage("Invalid repository format. Use: owner/repo");
    }
  }
}

async function refreshCommand(): Promise<void> {
  state.lastRefresh = Date.now();
  await Promise.all([triageIssueCommand(), reviewPRCommand(), checkHealthCommand()]);
  dashboardProvider.refresh();
}

// ─── Tree View Providers ───

class IssueTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    if (state.issues.length === 0) {
      return [new vscode.TreeItem("No issues — add a repo first", vscode.TreeItemCollapsibleState.None)];
    }

    return state.issues.map((issue) => {
      const priorityIcon = issue.priority === "critical" ? "🔴" : issue.priority === "high" ? "🟠" : issue.priority === "medium" ? "🟡" : "🟢";
      const item = new vscode.TreeItem(
        `${priorityIcon} #${issue.number}: ${issue.title.slice(0, 60)}`,
        vscode.TreeItemCollapsibleState.None
      );
      item.description = `${issue.priority} · ${issue.labels.join(", ")}`;
      item.tooltip = `${issue.title}\n\nPriority: ${issue.priority}\nLabels: ${issue.labels.join(", ")}`;
      item.command = {
        command: "vscode.open",
        title: "Open Issue",
        arguments: [vscode.Uri.parse(issue.url)],
      };
      return item;
    });
  }
}

class PRTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    if (state.pullRequests.length === 0) {
      return [new vscode.TreeItem("No open PRs", vscode.TreeItemCollapsibleState.None)];
    }

    return state.pullRequests.map((pr) => {
      const riskIcon = pr.riskLevel === "high" ? "🔴" : pr.riskLevel === "medium" ? "🟡" : "🟢";
      const item = new vscode.TreeItem(
        `${riskIcon} #${pr.number}: ${pr.title.slice(0, 60)}`,
        vscode.TreeItemCollapsibleState.None
      );
      item.description = `${pr.riskLevel} risk · ${pr.recommendation}`;
      item.tooltip = `${pr.title}\n\nRisk: ${pr.riskLevel}\nRecommendation: ${pr.recommendation}`;
      item.command = {
        command: "vscode.open",
        title: "Open PR",
        arguments: [vscode.Uri.parse(pr.url)],
      };
      return item;
    });
  }
}

class DashboardProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = [];

    if (!state.currentRepo) {
      items.push(new vscode.TreeItem("No repository connected", vscode.TreeItemCollapsibleState.None));
      items.push(new vscode.TreeItem("Click + to add a repo", vscode.TreeItemCollapsibleState.None));
      return items;
    }

    // Repo info
    const repoItem = new vscode.TreeItem(`📦 ${state.currentRepo}`, vscode.TreeItemCollapsibleState.Expanded);
    repoItem.contextValue = "repo";
    items.push(repoItem);

    // Health
    if (state.healthScore !== null) {
      const scoreColor = state.healthScore >= 70 ? "✅" : state.healthScore >= 40 ? "⚠️" : "🔴";
      const healthItem = new vscode.TreeItem(`${scoreColor} Health: ${state.healthScore}/100`, vscode.TreeItemCollapsibleState.None);
      healthItem.command = { command: "gritgauge.checkHealth", title: "Check Health" };
      items.push(healthItem);
    }

    // Quick stats
    items.push(new vscode.TreeItem(`📋 Issues: ${state.issues.length}`, vscode.TreeItemCollapsibleState.None));
    items.push(new vscode.TreeItem(`🔀 PRs: ${state.pullRequests.length}`, vscode.TreeItemCollapsibleState.None));

    // Actions
    const actionsItem = new vscode.TreeItem("⚡ Actions", vscode.TreeItemCollapsibleState.Expanded);
    items.push(actionsItem);

    const triageAction = new vscode.TreeItem("Run AI Triage", vscode.TreeItemCollapsibleState.None);
    triageAction.command = { command: "gritgauge.triageIssue", title: "Triage" };
    items.push(triageAction);

    const reviewAction = new vscode.TreeItem("Run AI Review", vscode.TreeItemCollapsibleState.None);
    reviewAction.command = { command: "gritgauge.reviewPR", title: "Review" };
    items.push(reviewAction);

    const securityAction = new vscode.TreeItem("Security Scan", vscode.TreeItemCollapsibleState.None);
    securityAction.command = { command: "gritgauge.scanSecurity", title: "Security Scan" };
    items.push(securityAction);

    return items;
  }
}
