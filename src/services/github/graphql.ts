/**
 * GitHub GraphQL API Integration
 * Provides richer data access than REST API for complex queries
 */
import { cache } from "@/services/cache";
import type { RepoInfo, Issue, PullRequest, Contributor, CommitActivity, Release } from "@/types";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const cacheKey = `gql:${query.slice(0, 100)}:${JSON.stringify(variables)}`;
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) return cached;

  const response = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL error: ${response.status}`);
  }

  const result = (await response.json()) as GraphQLResponse<T>;
  if (result.errors) {
    throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
  }

  cache.set(cacheKey, result.data, 120); // Cache for 2 minutes
  return result.data;
}

// ─── Enhanced Repository Info ───

export async function getRepoDetails(owner: string, name: string): Promise<RepoInfo> {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        owner { login }
        name
        nameWithOwner
        description
        stargazerCount
        forkCount
        openIssues: issues(states: OPEN) { totalCount }
        openPRs: pullRequests(states: OPEN) { totalCount }
        primaryLanguage { name }
        repositoryTopics(first: 10) { nodes { topic { name } } }
        licenseInfo { spdxId }
        createdAt
        updatedAt
        url
        homepageUrl
        defaultBranchRef { name }
        watchers { totalCount }
        diskUsage
      }
    }
  `;

  const data = await graphqlRequest<{
    repository: {
      owner: { login: string };
      name: string;
      nameWithOwner: string;
      description: string | null;
      stargazerCount: number;
      forkCount: number;
      openIssues: { totalCount: number };
      openPRs: { totalCount: number };
      primaryLanguage: { name: string } | null;
      repositoryTopics: { nodes: { topic: { name: string } }[] };
      licenseInfo: { spdxId: string } | null;
      createdAt: string;
      updatedAt: string;
      url: string;
      homepageUrl: string | null;
      defaultBranchRef: { name: string } | null;
      watchers: { totalCount: number };
      diskUsage: number;
    };
  }>(query, { owner, name });

  const repo = data.repository;
  return {
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.nameWithOwner,
    description: repo.description,
    stars: repo.stargazerCount,
    forks: repo.forkCount,
    openIssues: repo.openIssues.totalCount,
    openPRs: repo.openPRs.totalCount,
    language: repo.primaryLanguage?.name || null,
    topics: repo.repositoryTopics.nodes.map((n) => n.topic.name),
    license: repo.licenseInfo?.spdxId || null,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
    url: repo.url,
    homepage: repo.homepageUrl,
    defaultBranch: repo.defaultBranchRef?.name || "main",
    watchers: repo.watchers.totalCount,
    size: repo.diskUsage,
  };
}

// ─── Commit Activity (Last Year) ───

export async function getCommitActivity(
  owner: string,
  name: string
): Promise<CommitActivity[]> {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 52) {
                nodes {
                  committedDate
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<{
    repository: {
      defaultBranchRef: {
        target: {
          history: {
            nodes: { committedDate: string }[];
          };
        };
      } | null;
    };
  }>(query, { owner, name });

  const commits = data.repository.defaultBranchRef?.target.history.nodes || [];

  // Group by week
  const weeklyCommits: Map<number, number> = new Map();
  for (const commit of commits) {
    const date = new Date(commit.committedDate);
    const weekStart = Math.floor(date.getTime() / (7 * 86400000));
    weeklyCommits.set(weekStart, (weeklyCommits.get(weekStart) || 0) + 1);
  }

  return Array.from(weeklyCommits.entries()).map(([week, total]) => ({
    week,
    days: [0, 0, 0, 0, 0, 0, total],
    total,
  }));
}

// ─── Recent Releases ───

export async function getReleases(
  owner: string,
  name: string,
  limit: number = 10
): Promise<Release[]> {
  const query = `
    query($owner: String!, $name: String!, $limit: Int!) {
      repository(owner: $owner, name: $name) {
        releases(first: $limit, orderBy: { field: CREATED_AT, direction: DESC }) {
          nodes {
            tagName
            name
            description
            createdAt
            publishedAt
            isPrerelease
            url
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<{
    repository: {
      releases: {
        nodes: {
          tagName: string;
          name: string | null;
          description: string | null;
          createdAt: string;
          publishedAt: string | null;
          isPrerelease: boolean;
          url: string;
        }[];
      };
    };
  }>(query, { owner, name, limit });

  return data.repository.releases.nodes.map((r) => ({
    tag: r.tagName,
    name: r.name || r.tagName,
    body: r.description,
    createdAt: r.createdAt,
    publishedAt: r.publishedAt || r.createdAt,
    isPrerelease: r.isPrerelease,
    url: r.url,
  }));
}

// ─── Contributor Stats ───

export async function getContributorStats(
  owner: string,
  name: string,
  limit: number = 30
): Promise<Contributor[]> {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        mentionableUsers(first: 30) {
          nodes {
            login
            avatarUrl
            ... on User { contributions: contributionsCollection { totalCommitContributions } }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<{
    repository: {
      mentionableUsers: {
        nodes: {
          login: string;
          avatarUrl: string;
          contributions?: { totalCommitContributions: number };
          __typename: string;
        }[];
      };
    };
  }>(query, { owner, name });

  return data.repository.mentionableUsers.nodes
    .filter((u) => u.__typename === "User")
    .map((u) => ({
      login: u.login,
      contributions: u.contributions?.totalCommitContributions || 0,
      avatarUrl: u.avatarUrl,
      type: "User" as const,
    }));
}

// ─── Issue Timeline ───

export async function getIssueTimeline(
  owner: string,
  name: string,
  issueNumber: number
): Promise<{ date: string; event: string; actor: string }[]> {
  const query = `
    query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        issue(number: $number) {
          timelineItems(first: 50) {
            nodes {
              __typename
              ... on LabeledEvent { createdAt, actor { login } }
              ... on AssignedEvent { createdAt, actor { login } }
              ... on ClosedEvent { createdAt, actor { login } }
              ... on ReopenedEvent { createdAt, actor { login } }
              ... on CommentDeletedEvent { createdAt, actor { login } }
              ... on ReferencedEvent { createdAt, actor { login } }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<{
    repository: {
      issue: {
        timelineItems: {
          nodes: { __typename: string; createdAt: string; actor?: { login: string } }[];
        };
      };
    };
  }>(query, { owner, name, number: issueNumber });

  return data.repository.issue.timelineItems.nodes.map((node) => ({
    date: node.createdAt,
    event: node.__typename.replace("Event", "").toLowerCase(),
    actor: node.actor?.login || "unknown",
  }));
}
