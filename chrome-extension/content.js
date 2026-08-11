/**
 * GritGauge Chrome Extension — Content Script
 * Injects health indicators and AI insights directly into GitHub pages
 */

// ─── Configuration ───

interface ExtensionConfig {
  apiUrl: string;
  apiKey: string;
  showHealthBadge: boolean;
  showTriageInline: boolean;
  showPRRiskBadge: boolean;
}

const DEFAULT_CONFIG: ExtensionConfig = {
  apiUrl: "http://localhost:3000",
  apiKey: "",
  showHealthBadge: true,
  showTriageInline: true,
  showPRRiskBadge: true,
};

let config: ExtensionConfig = DEFAULT_CONFIG;

// ─── Initialization ───

async function init(): Promise<void> {
  // Load config from storage
  const stored = await chrome.storage.sync.get("gritgaugeConfig");
  if (stored.gritgaugeConfig) {
    config = { ...DEFAULT_CONFIG, ...stored.gritgaugeConfig };
  }

  // Detect current page type
  const path = window.location.pathname;
  const isRepoPage = /^\/[^/]+\/[^/]+$/.test(path);
  const isIssuesPage = /^\/[^/]+\/[^/]+\/issues/.test(path);
  const isPRPage = /^\/[^/]+\/[^/]+\/pull/.test(path);
  const repoFullName = path.split("/").slice(1, 3).join("/");

  if (isRepoPage && config.showHealthBadge) {
    injectHealthBadge(repoFullName);
  }

  if (isIssuesPage && config.showTriageInline) {
    injectTriageButtons(repoFullName);
  }

  if (isPRPage && config.showPRRiskBadge) {
    injectPRRiskBadge(repoFullName);
  }
}

// ─── Health Badge Injection ───

async function injectHealthBadge(repo: string): Promise<void> {
  // Wait for repo header to load
  const header = await waitForElement("#repository-container-header");
  if (!header) return;

  // Fetch health data
  try {
    const response = await fetch(`${config.apiUrl}/api/analytics?repoId=${encodeURIComponent(repo)}`);
    if (!response.ok) return;

    const data = await response.json() as { data: { healthScore: number; busFactor: number; responseTimeAvg: number } };
    const { healthScore, busFactor, responseTimeAvg } = data.data || {};

    const scoreColor = healthScore >= 70 ? "#22c55e" : healthScore >= 40 ? "#f59e0b" : "#ef4444";

    // Create badge element
    const badge = document.createElement("div");
    badge.className = "gritgauge-health-badge";
    badge.innerHTML = `
      <div style="
        background: ${scoreColor}15;
        border: 1px solid ${scoreColor}30;
        border-radius: 8px;
        padding: 12px 16px;
        margin: 12px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:24px;font-weight:700;color:${scoreColor};">${healthScore || "?"}</span>
          <span style="font-size:12px;color:#64748b;">/100 Health Score</span>
          <span style="margin-left:auto;font-size:11px;color:#64748b;">⚡ GritGauge</span>
        </div>
        <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:#94a3b8;">
          <span>🚌 Bus Factor: ${busFactor || "?"}</span>
          <span>⏱ Response: ${responseTimeAvg ? responseTimeAvg.toFixed(1) + "h" : "?"}</span>
        </div>
      </div>
    `;

    header.appendChild(badge);
  } catch {
    // Silent fail — don't break GitHub
  }
}

// ─── Triage Buttons on Issues Page ───

async function injectTriageButtons(repo: string): Promise<void> {
  const issueList = await waitForElement('[aria-label="Issues"]');
  if (!issueList) return;

  // Add "AI Triage All" button to toolbar
  const toolbar = document.querySelector(".issues-toolbar, .table-list-header-toggle");
  if (toolbar) {
    const triageAllBtn = document.createElement("button");
    triageAllBtn.className = "btn btn-sm gritgauge-triage-all";
    triageAllBtn.textContent = "🤖 AI Triage All";
    triageAllBtn.style.cssText = "margin-left:8px;background:#16a34a;color:white;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;";
    triageAllBtn.onclick = () => triageAllIssues(repo);
    toolbar.appendChild(triageAllBtn);
  }

  // Add individual triage buttons to each issue row
  const issueRows = document.querySelectorAll('[id^="issue_"]');
  issueRows.forEach((row) => {
    const issueLink = row.querySelector('a[data-hovercard-type="issue"]');
    if (!issueLink) return;

    const issueNumber = (issueLink as HTMLElement).dataset.number || "";
    const triageBtn = document.createElement("button");
    triageBtn.className = "gritgauge-triage-single";
    triageBtn.textContent = "🤖 Triage";
    triageBtn.style.cssText = "font-size:11px;color:#16a34a;background:none;border:1px solid #16a34a;border-radius:4px;padding:2px 8px;cursor:pointer;margin-left:8px;";
    triageBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triageSingleIssue(repo, parseInt(issueNumber));
    };

    const titleCell = row.querySelector(".markdown-title");
    if (titleCell) titleCell.appendChild(triageBtn);
  });
}

async function triageAllIssues(repo: string): Promise<void> {
  // Show progress
  const toast = showToast("Running AI triage on all issues...");

  try {
    const response = await fetch(`${config.apiUrl}/api/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo, batch: true }),
    });

    if (response.ok) {
      const data = await response.json() as { summary: { criticalCount: number; highCount: number } };
      toast.remove();
      showToast(`✅ Triaged! ${data.summary?.criticalCount || 0} critical, ${data.summary?.highCount || 0} high priority`, "success");
      setTimeout(() => window.location.reload(), 2000);
    }
  } catch {
    toast.remove();
    showToast("❌ Triage failed", "error");
  }
}

async function triageSingleIssue(repo: string, issueNumber: number): Promise<void> {
  const btn = document.querySelector(`.gritgauge-triage-single`) as HTMLButtonElement;
  if (btn) btn.textContent = "⏳...";

  try {
    const issueTitle = document.querySelector(".js-issue-title")?.textContent?.trim() || "";
    const response = await fetch(`${config.apiUrl}/api/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: issueTitle, issueBody: "", existingLabels: [] }),
    });

    if (response.ok) {
      const data = await response.json() as { priority: string; suggestedLabels: string[] };
      if (btn) btn.textContent = `✅ ${data.priority}`;
      if (btn) btn.style.color = data.priority === "critical" ? "#ef4444" : data.priority === "high" ? "#f59e0b" : "#22c55e";
    }
  } catch {
    if (btn) btn.textContent = "❌";
  }
}

// ─── PR Risk Badge ───

async function injectPRRiskBadge(repo: string): Promise<void> {
  const prHeader = await waitForElement(".gh-header-show");
  if (!prHeader) return;

  const prTitle = document.querySelector(".js-issue-title")?.textContent?.trim() || "";
  const prBody = document.querySelector(".comment-body")?.textContent?.trim() || "";

  try {
    const response = await fetch(`${config.apiUrl}/api/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: prTitle, prBody, filesChanged: 0, additions: 0, deletions: 0 }),
    });

    if (response.ok) {
      const data = await response.json() as { riskLevel: string; recommendation: string; summary: string };

      const riskColor = data.riskLevel === "high" ? "#ef4444" : data.riskLevel === "medium" ? "#f59e0b" : "#22c55e";
      const recEmoji = data.recommendation === "approve" ? "✅" : data.recommendation === "request_changes" ? "🔴" : "💬";

      const badge = document.createElement("div");
      badge.className = "gritgauge-pr-badge";
      badge.innerHTML = `
        <div style="
          background: ${riskColor}10;
          border: 1px solid ${riskColor}30;
          border-radius: 8px;
          padding: 12px;
          margin: 12px 0;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        ">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;color:${riskColor};text-transform:uppercase;font-size:13px;">${data.riskLevel} Risk</span>
            <span style="font-size:13px;">${recEmoji} ${data.recommendation.replace("_", " ")}</span>
            <span style="margin-left:auto;font-size:11px;color:#64748b;">🤖 GritGauge AI</span>
          </div>
          <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">${data.summary}</p>
        </div>
      `;

      prHeader.after(badge);
    }
  } catch {
    // Silent
  }
}

// ─── Utility Functions ───

function waitForElement(selector: string, timeout: number = 10000): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function showToast(
  message: string,
  type: "info" | "success" | "error" = "info"
): HTMLDivElement {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 9999;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    color: white;
    background: ${type === "success" ? "#16a34a" : type === "error" ? "#ef4444" : "#3b82f6"};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
  return toast;
}

// ─── Start ───

init();

// Listen for config changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.gritgaugeConfig) {
    config = { ...DEFAULT_CONFIG, ...changes.gritgaugeConfig.newValue };
  }
});
