/**
 * GritGauge SDK — JavaScript/TypeScript Client Library
 * Use GritGauge features programmatically in your own tools
 *
 * npm install gritgauge-sdk
 * or: import { GritGauge } from 'gritgauge-sdk';
 */

// ─── Types ───

export interface ClientConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface RepoData {
  fullName: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  language: string | null;
  healthScore: number;
}

export interface TriageResult {
  issueNumber: number;
  priority: "critical" | "high" | "medium" | "low";
  suggestedLabels: string[];
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  effort: "small" | "medium" | "large";
}

export interface ReviewResult {
  prNumber: number;
  riskLevel: "low" | "medium" | "high";
  recommendation: "approve" | "request_changes" | "comment";
  summary: string;
  keyChanges: string[];
  potentialIssues: string[];
}

export interface HealthMetrics {
  healthScore: number;
  busFactor: number;
  responseTimeAvg: number;
  staleIssueRatio: number;
  contributorCount: number;
  commitFrequency: number;
}

export interface CompareResult {
  repos: {
    fullName: string;
    healthScore: number;
    stars: number;
    busFactor: number;
  }[];
  winner: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

// ─── Client Class ───

export class GritGaugeClient {
  private apiUrl: string;
  private apiKey: string;
  private timeout: number;
  private retries: number;

  constructor(config: ClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey || "";
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
  }

  // ─── HTTP Helper ───

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.retries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError || new Error("Request failed");
  }

  // ─── Repository Methods ───

  async getRepo(owner: string, name: string): Promise<RepoData> {
    const response = await this.request<{ data: RepoData }>(
      `/api/github?repo=${encodeURIComponent(`${owner}/${name}`)}`
    );
    return response.data;
  }

  async saveRepo(owner: string, name: string): Promise<void> {
    await this.request("/api/repos", {
      method: "POST",
      body: JSON.stringify({ owner, name, fullName: `${owner}/${name}`, isMonitored: true }),
    });
  }

  async listRepos(): Promise<RepoData[]> {
    const response = await this.request<{ data: RepoData[] }>("/api/repos");
    return response.data;
  }

  async removeRepo(repoId: string): Promise<void> {
    await this.request(`/api/repos?id=${repoId}`, { method: "DELETE" });
  }

  // ─── AI Triage Methods ───

  async triageIssue(
    title: string,
    body?: string,
    labels?: string[]
  ): Promise<TriageResult> {
    const response = await this.request<TriageResult>("/api/triage", {
      method: "POST",
      body: JSON.stringify({
        title,
        issueBody: body || null,
        existingLabels: labels || [],
      }),
    });
    return response;
  }

  async batchTriage(issues: { title: string; body?: string; labels?: string }[]): Promise<TriageResult[]> {
    const results: TriageResult[] = [];
    for (const issue of issues) {
      const result = await this.triageIssue(issue.title, issue.body, issue.labels ? [issue.labels] : []);
      results.push(result);
    }
    return results;
  }

  // ─── PR Review Methods ───

  async reviewPR(
    title: string,
    body?: string,
    filesChanged?: number,
    additions?: number,
    deletions?: number
  ): Promise<ReviewResult> {
    const response = await this.request<ReviewResult>("/api/review", {
      method: "POST",
      body: JSON.stringify({
        title,
        prBody: body || null,
        filesChanged: filesChanged || 0,
        additions: additions || 0,
        deletions: deletions || 0,
      }),
    });
    return response;
  }

  // ─── Health Methods ───

  async getHealth(repoId: string): Promise<HealthMetrics> {
    const response = await this.request<{ data: HealthMetrics }>(
      `/api/analytics?repoId=${repoId}`
    );
    return response.data;
  }

  // ─── Compare Methods ───

  async compareRepos(repoIds: string[]): Promise<CompareResult> {
    const params = repoIds.map((id) => `repoId=${encodeURIComponent(id)}`).join("&");
    const response = await this.request<{ data: CompareResult }>(`/api/compare?${params}`);
    return response.data;
  }

  // ─── Export Methods ───

  async exportReport(
    repoFullName: string,
    format: "pdf" | "csv" | "json" | "markdown",
    type: "health" | "activity" | "security"
  ): Promise<string> {
    const response = await this.request<string>("/api/export", {
      method: "POST",
      body: JSON.stringify({
        repoFullName,
        format,
        type,
        title: `GritGauge ${type} Report`,
      }),
    });
    return response;
  }

  // ─── Webhook Methods ───

  async createWebhook(config: WebhookConfig): Promise<{ id: string }> {
    const response = await this.request<{ data: { id: string } }>("/api/webhooks", {
      method: "POST",
      body: JSON.stringify(config),
    });
    return response.data;
  }

  async listWebhooks(): Promise<{ id: string; url: string; events: string[]; isActive: boolean }[]> {
    const response = await this.request<{ data: { id: string; url: string; events: string[]; isActive: boolean }[] }>("/api/webhooks");
    return response.data;
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.request(`/api/webhooks?id=${id}`, { method: "DELETE" });
  }

  // ─── Settings Methods ───

  async getSettings(): Promise<Record<string, unknown>> {
    const response = await this.request<{ data: Record<string, unknown> }>("/api/settings");
    return response.data;
  }

  async updateSettings(settings: Record<string, unknown>): Promise<void> {
    await this.request("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  // ─── Health Check ───

  async ping(): Promise<{ status: string; version: string }> {
    const response = await this.request<{ status: string; version: string }>("/api/health");
    return response;
  }
}

// ─── Convenience Factory ───

export function createClient(config: Partial<ClientConfig> & { apiUrl: string }): GritGaugeClient {
  return new GritGaugeClient({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    timeout: config.timeout || 30000,
    retries: config.retries || 3,
  });
}

// ─── CLI Helper (for Node.js scripts) ───

export async function quickTriage(
  apiUrl: string,
  repo: string,
  issueTitle: string,
  apiKey?: string
): Promise<TriageResult> {
  const client = createClient({ apiUrl, apiKey });
  return client.triageIssue(issueTitle);
}

export async function quickReview(
  apiUrl: string,
  prTitle: string,
  prBody: string,
  apiKey?: string
): Promise<ReviewResult> {
  const client = createClient({ apiUrl, apiKey });
  return client.reviewPR(prTitle, prBody);
}

// ─── React Hook ───

export function useGritGauge(apiUrl: string, apiKey?: string) {
  const client = createClient({ apiUrl, apiKey });

  return {
    client,
    getRepo: (owner: string, name: string) => client.getRepo(owner, name),
    triageIssue: (title: string, body?: string, labels?: string[]) =>
      client.triageIssue(title, body, labels),
    reviewPR: (title: string, body?: string) => client.reviewPR(title, body),
    getHealth: (repoId: string) => client.getHealth(repoId),
    compareRepos: (repoIds: string[]) => client.compareRepos(repoIds),
  };
}

export default GritGaugeClient;
