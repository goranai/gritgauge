import { Octokit } from "@octokit/rest";
import type { RepoInfo, Issue, PullRequest, Release } from "@/types";
import { cache } from "@/services/cache";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// ─── Repository Info ───

export async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const cacheKey = `repo:${owner}/${repo}`;
  const cached = cache.get<RepoInfo>(cacheKey);
  if (cached) return cached;

  const { data } = await octokit.repos.get({ owner, repo });

  const result: RepoInfo = {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    openPRs: 0,
    language: data.language,
    topics: data.topics || [],
    license: data.license?.spdx_id || null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    url: data.html_url,
    homepage: data.homepage,
    defaultBranch: data.default_branch,
    watchers: data.watchers_count,
    size: data.size,
  };

  cache.set(cacheKey, result, 120);
  return result;
}

// ─── Issues ───

export async function fetchOpenIssues(
  owner: string,
  repo: string,
  limit = 20
): Promise<Issue[]> {
  const cacheKey = `issues:${owner}/${repo}:${limit}`;
  const cached = cache.get<Issue[]>(cacheKey);
  if (cached) return cached;

  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: "open",
    per_page: limit,
    sort: "created",
    direction: "desc",
    filter: "all",
  });

  const result = data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state as "open" | "closed",
      labels: (issue.labels || []).map((l) =>
        typeof l === "string" ? l : l.name || ""
      ),
      assignee: issue.assignee?.login || null,
      assignees: issue.assignees?.map((a) => a.login) || [],
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at || null,
      url: issue.html_url,
      body: issue.body || null,
      author: issue.user?.login || "unknown",
      comments: issue.comments || 0,
      reactions: { total: issue.reactions?.["+1"] || 0 },
      milestone: issue.milestone?.title || null,
    }));

  cache.set(cacheKey, result, 60);
  return result;
}

export async function fetchClosedIssues(
  owner: string,
  repo: string,
  limit = 20
): Promise<Issue[]> {
  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: "closed",
    per_page: limit,
    sort: "updated",
    direction: "desc",
    filter: "all",
  });

  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state as "open" | "closed",
      labels: (issue.labels || []).map((l) =>
        typeof l === "string" ? l : l.name || ""
      ),
      assignee: issue.assignee?.login || null,
      assignees: [],
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at || null,
      url: issue.html_url,
      body: issue.body || null,
      author: issue.user?.login || "unknown",
      comments: issue.comments || 0,
      reactions: { total: 0 },
      milestone: issue.milestone?.title || null,
    }));
}

export async function fetchIssueDetail(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<Issue> {
  const { data } = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return {
    number: data.number,
    title: data.title,
    state: data.state as "open" | "closed",
    labels: (data.labels || []).map((l) =>
      typeof l === "string" ? l : l.name || ""
    ),
    assignee: data.assignee?.login || null,
    assignees: data.assignees?.map((a) => a.login) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    closedAt: data.closed_at || null,
    url: data.html_url,
    body: data.body || null,
    author: data.user?.login || "unknown",
    comments: data.comments || 0,
    reactions: { total: data.reactions?.["+1"] || 0 },
    milestone: data.milestone?.title || null,
  };
}

// ─── Pull Requests ───

export async function fetchOpenPRs(
  owner: string,
  repo: string,
  limit = 20
): Promise<PullRequest[]> {
  const cacheKey = `prs:${owner}/${repo}:${limit}`;
  const cached = cache.get<PullRequest[]>(cacheKey);
  if (cached) return cached;

  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    per_page: limit,
    sort: "created",
    direction: "desc",
  });

  const result = data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state as "open" | "closed",
    author: pr.user?.login || "unknown",
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at || null,
    url: pr.html_url,
    body: pr.body || null,
    additions: pr.additions || 0,
    deletions: pr.deletions || 0,
    filesChanged: pr.changed_files || 0,
    baseBranch: pr.base?.ref || "main",
    headBranch: pr.head?.ref || "",
    isDraft: pr.draft || false,
    reviewComments: pr.review_comments || 0,
  }));

  cache.set(cacheKey, result, 60);
  return result;
}

export async function fetchPRDetail(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PullRequest> {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    number: data.number,
    title: data.title,
    state: data.state as "open" | "closed",
    author: data.user?.login || "unknown",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    mergedAt: data.merged_at || null,
    url: data.html_url,
    body: data.body || null,
    additions: data.additions || 0,
    deletions: data.deletions || 0,
    filesChanged: data.changed_files || 0,
    baseBranch: data.base.ref,
    headBranch: data.head.ref,
    isDraft: data.draft || false,
    reviewComments: data.review_comments || 0,
  };
}

export async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ filename: string; status: string; additions: number; deletions: number; changes: number; patch?: string }[]> {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  return data.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch,
  }));
}

// ─── Contributors ───

export async function fetchContributors(
  owner: string,
  repo: string
): Promise<{ login: string; contributions: number; avatarUrl: string; type: "User" | "Bot" }[]> {
  const { data } = await octokit.repos.listContributors({
    owner,
    repo,
    per_page: 30,
  });

  return data.map((c) => ({
    login: c.login || "unknown",
    contributions: c.contributions || 0,
    avatarUrl: c.avatar_url || "",
    type: (c.type === "Bot" ? "Bot" : "User") as "User" | "Bot",
  }));
}

// ─── Releases ───

export async function fetchReleases(
  owner: string,
  repo: string,
  limit = 10
): Promise<Release[]> {
  const { data } = await octokit.repos.listReleases({
    owner,
    repo,
    per_page: limit,
  });

  return data.map((r) => ({
    tag: r.tag_name,
    name: r.name || r.tag_name,
    body: r.body,
    createdAt: r.created_at,
    publishedAt: r.published_at || r.created_at,
    isPrerelease: r.prerelease || false,
    url: r.html_url,
  }));
}

// ─── Code Search ───

export async function searchCode(
  query: string,
  owner?: string,
  repo?: string
): Promise<{ path: string; repo: string }[]> {
  const repoFilter = owner && repo ? `repo:${owner}/${repo}` : "";
  const { data } = await octokit.search.code({
    q: `${query} ${repoFilter}`,
    per_page: 30,
  });

  return data.items.map((item) => ({
    path: item.path,
    repo: item.repository?.full_name || "",
  }));
}

// ─── Rate Limit Info ───

export async function getRateLimit(): Promise<{
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}> {
  const { data } = await octokit.rateLimit.get();
  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: data.rate.reset,
    used: data.rate.used,
  };
}

// ─── Batch Operations ───

export async function batchFetchRepos(
  repos: { owner: string; name: string }[]
): Promise<RepoInfo[]> {
  const results: RepoInfo[] = [];
  for (const repo of repos) {
    try {
      const info = await fetchRepoInfo(repo.owner, repo.name);
      results.push(info);
    } catch {
      // Skip failed repos
    }
  }
  return results;
}

// ─── Repo Comparison ───

export async function compareRepoStats(
  repos: { owner: string; name: string }[]
): Promise<{
  name: string;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  healthIndicator: string;
}[]> {
  const infos = await batchFetchRepos(repos);

  const maxStars = Math.max(...infos.map((r) => r.stars), 1);

  return infos.map((r) => ({
    name: r.fullName,
    stars: r.stars,
    forks: r.forks,
    openIssues: r.openIssues,
    language: r.language,
    healthIndicator:
      r.stars > maxStars * 0.5
        ? "🔥 Very Popular"
        : r.stars > maxStars * 0.2
        ? "📈 Growing"
        : "🌱 Emerging",
  }));
}

