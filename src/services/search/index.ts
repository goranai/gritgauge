/**
 * Full-Text Search & Aggregation Engine
 * Searches across issues, PRs, repos, users, notifications, audit logs
 * with fuzzy matching, ranking, facets, and aggregations
 */
import prisma from "@/lib/prisma";

// ─── Types ───

export type SearchEntity = "issues" | "prs" | "repos" | "users" | "notifications" | "audit_logs" | "all";

export interface SearchParams {
  query: string;
  entities?: SearchEntity[];
  filters?: {
    repo?: string;
    userId?: string;
    priority?: string;
    riskLevel?: string;
    dateFrom?: string;
    dateTo?: string;
    labels?: string[];
    state?: "open" | "closed" | "all";
    language?: string;
    minStars?: number;
    sentiment?: "positive" | "neutral" | "negative";
  };
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  page?: number;
  pageSize?: number;
  fuzzy?: boolean;
  highlight?: boolean;
}

export interface SearchResult<T = unknown> {
  entity: SearchEntity;
  id: string;
  title: string;
  description: string;
  url?: string;
  score: number;
  highlights?: Record<string, string[]>;
  metadata: T;
  matchedFields: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    entities: { key: string; count: number }[];
    priorities: { key: string; count: number }[];
    riskLevels: { key: string; count: number }[];
    sentiments: { key: string; count: number }[];
    repos: { key: string; count: number }[];
    dateRange: { min: string; max: string };
  };
  suggestions: string[];
  took: number; // ms
}

// ─── Text Processing ───

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s@#/-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function ngrams(tokens: string[], n: number = 2): string[] {
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(" "));
  }
  return result;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function fuzzyScore(query: string, target: string): number {
  if (target.includes(query)) return 1.0;
  if (query.includes(target)) return 0.8;

  const queryTokens = tokenize(query);
  const targetTokens = tokenize(target);

  let score = 0;
  for (const qt of queryTokens) {
    for (const tt of targetTokens) {
      if (tt.includes(qt)) {
        score += 0.5;
      } else {
        const dist = levenshteinDistance(qt, tt);
        const maxLen = Math.max(qt.length, tt.length);
        if (maxLen > 0) {
          const similarity = 1 - dist / maxLen;
          if (similarity > 0.7) score += similarity * 0.3;
        }
      }
    }
  }

  // Bonus for n-gram matches
  const queryBigrams = ngrams(queryTokens, 2);
  const targetBigrams = ngrams(targetTokens, 2);
  for (const qb of queryBigrams) {
    if (targetBigrams.includes(qb)) score += 0.2;
  }

  return Math.min(1, score / Math.max(1, queryTokens.length));
}

function highlightMatches(text: string, queryTokens: string[]): string[] {
  const highlights: string[] = [];
  const lower = text.toLowerCase();

  for (const token of queryTokens) {
    let startIdx = 0;
    while (startIdx < lower.length) {
      const idx = lower.indexOf(token, startIdx);
      if (idx === -1) break;

      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + token.length + 40);
      highlights.push(
        (start > 0 ? "..." : "") +
        text.slice(start, idx) +
        "**" + text.slice(idx, idx + token.length) + "**" +
        text.slice(idx + token.length, end) +
        (end < text.length ? "..." : "")
      );
      startIdx = idx + token.length;
    }
  }

  return highlights.slice(0, 5);
}

// ─── Search Engine ───

export async function search(params: SearchParams): Promise<SearchResponse> {
  const startTime = Date.now();
  const entities = params.entities || ["all"];
  const query = params.query.trim().toLowerCase();
  const queryTokens = tokenize(query);

  let allResults: SearchResult[] = [];

  // Search issues
  if (entities.includes("all") || entities.includes("issues")) {
    const issues = await searchIssues(query, queryTokens, params);
    allResults = allResults.concat(issues);
  }

  // Search PRs
  if (entities.includes("all") || entities.includes("prs")) {
    const prs = await searchPRs(query, queryTokens, params);
    allResults = allResults.concat(prs);
  }

  // Search repos
  if (entities.includes("all") || entities.includes("repos")) {
    const repos = await searchRepos(query, queryTokens, params);
    allResults = allResults.concat(repos);
  }

  // Search notifications
  if (entities.includes("notifications")) {
    const notifs = await searchNotifications(query, queryTokens, params);
    allResults = allResults.concat(notifs);
  }

  // Score and sort
  for (const result of allResults) {
    const titleScore = fuzzyScore(query, result.title);
    const descScore = fuzzyScore(query, result.description);
    result.score = titleScore * 0.6 + descScore * 0.4;

    if (params.highlight) {
      result.highlights = {
        title: highlightMatches(result.title, queryTokens),
        description: highlightMatches(result.description, queryTokens),
      };
    }
  }

  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);

  // Filter out very low scores unless fuzzy is off
  if (!params.fuzzy) {
    allResults = allResults.filter((r) => r.score > 0.1);
  }

  const total = allResults.length;

  // Paginate
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const start = (page - 1) * pageSize;
  const paginated = allResults.slice(start, start + pageSize);

  // Build facets
  const facets = buildFacets(allResults);

  // Generate suggestions
  const suggestions = generateSuggestions(query, allResults);

  return {
    results: paginated,
    total,
    page,
    pageSize,
    facets,
    suggestions,
    took: Date.now() - startTime,
  };
}

// ─── Entity-Specific Search Implementations ───

async function searchIssues(
  query: string,
  queryTokens: string[],
  params: SearchParams
): Promise<SearchResult[]> {
  const where: Record<string, unknown> = {};

  if (params.filters?.repo) {
    where.repo = { fullName: params.filters.repo };
  }
  if (params.filters?.priority) {
    where.priority = params.filters.priority;
  }
  if (params.filters?.labels && params.filters.labels.length > 0) {
    where.suggestedLabels = { hasSome: params.filters.labels };
  }
  if (params.filters?.sentiment) {
    where.sentiment = params.filters.sentiment;
  }
  if (params.filters?.dateFrom) {
    where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), gte: new Date(params.filters.dateFrom) };
  }
  if (params.filters?.dateTo) {
    where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: new Date(params.filters.dateTo) };
  }

  // Text search across title and summary
  const issues = await prisma.triageLog.findMany({
    where: {
      OR: [
        { issueTitle: { contains: query, mode: "insensitive" as const } },
        { summary: { contains: query, mode: "insensitive" as const } },
        ...queryTokens.map((t) => ({
          OR: [
            { issueTitle: { contains: t, mode: "insensitive" as const } },
            { summary: { contains: t, mode: "insensitive" as const } },
          ],
        })),
      ].flat(),
      ...(Object.keys(where).length > 0 ? where : {}),
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  return issues.map((issue) => ({
    entity: "issues" as SearchEntity,
    id: `issue-${issue.issueNumber}`,
    title: issue.issueTitle,
    description: issue.summary,
    url: `https://github.com/issues/${issue.issueNumber}`,
    score: 0,
    metadata: {
      issueNumber: issue.issueNumber,
      priority: issue.priority,
      sentiment: issue.sentiment,
      labels: issue.suggestedLabels,
      createdAt: issue.createdAt,
    },
    matchedFields: [],
  }));
}

async function searchPRs(
  query: string,
  queryTokens: string[],
  params: SearchParams
): Promise<SearchResult[]> {
  const reviews = await prisma.reviewLog.findMany({
    where: {
      AND: [
        {
          OR: [
            { prTitle: { contains: query, mode: "insensitive" as const } },
            ...queryTokens.map((t) => ({
              prTitle: { contains: t, mode: "insensitive" as const },
            })),
          ],
        },
        ...(params.filters?.riskLevel ? [{ riskLevel: params.filters.riskLevel }] : []),
        ...(params.filters?.repo ? [{ repo: { fullName: params.filters.repo } }] : []),
      ],
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  return reviews.map((review) => ({
    entity: "prs" as SearchEntity,
    id: `pr-${review.prNumber}`,
    title: review.prTitle,
    description: review.keyChanges.join("; "),
    score: 0,
    metadata: {
      prNumber: review.prNumber,
      riskLevel: review.riskLevel,
      recommendation: review.recommendation,
      createdAt: review.createdAt,
    },
    matchedFields: [],
  }));
}

async function searchRepos(
  query: string,
  queryTokens: string[],
  params: SearchParams
): Promise<SearchResult[]> {
  const repos = await prisma.savedRepo.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
        ...queryTokens.map((t) => ({
          fullName: { contains: t, mode: "insensitive" as const },
        })),
      ],
      ...(params.filters?.language ? { language: params.filters.language } : {}),
      ...(params.filters?.minStars ? { stars: { gte: params.filters.minStars } } : {}),
    },
    take: 50,
    orderBy: { stars: "desc" },
  });

  return repos.map((repo) => ({
    entity: "repos" as SearchEntity,
    id: repo.id,
    title: repo.fullName,
    description: repo.description || "",
    score: 0,
    metadata: {
      stars: repo.stars,
      forks: repo.forks,
      language: repo.language,
      openIssues: repo.openIssues,
    },
    matchedFields: [],
  }));
}

async function searchNotifications(
  query: string,
  queryTokens: string[],
  params: SearchParams
): Promise<SearchResult[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: params.filters?.userId,
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { body: { contains: query, mode: "insensitive" as const } },
      ],
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return notifications.map((n) => ({
    entity: "notifications" as SearchEntity,
    id: n.id,
    title: n.title,
    description: n.body,
    score: 0,
    metadata: { read: n.read, createdAt: n.createdAt },
    matchedFields: [],
  }));
}

// ─── Facets ───

function buildFacets(results: SearchResult[]): SearchResponse["facets"] {
  const entityCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  const riskCounts = new Map<string, number>();
  const sentimentCounts = new Map<string, number>();
  const repoCounts = new Map<string, number>();
  let minDate = new Date().toISOString();
  let maxDate = "1970-01-01";

  for (const r of results) {
    entityCounts.set(r.entity, (entityCounts.get(r.entity) || 0) + 1);

    const meta = r.metadata as Record<string, unknown>;
    if (meta.priority) priorityCounts.set(meta.priority as string, (priorityCounts.get(meta.priority as string) || 0) + 1);
    if (meta.riskLevel) riskCounts.set(meta.riskLevel as string, (riskCounts.get(meta.riskLevel as string) || 0) + 1);
    if (meta.sentiment) sentimentCounts.set(meta.sentiment as string, (sentimentCounts.get(meta.sentiment as string) || 0) + 1);
    if (meta.createdAt) {
      const d = String(meta.createdAt);
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    }
  }

  return {
    entities: Array.from(entityCounts).map(([key, count]) => ({ key, count })),
    priorities: Array.from(priorityCounts).map(([key, count]) => ({ key, count })),
    riskLevels: Array.from(riskCounts).map(([key, count]) => ({ key, count })),
    sentiments: Array.from(sentimentCounts).map(([key, count]) => ({ key, count })),
    repos: Array.from(repoCounts).map(([key, count]) => ({ key, count })),
    dateRange: { min: minDate, max: maxDate },
  };
}

// ─── Suggestions ───

function generateSuggestions(query: string, results: SearchResult[]): string[] {
  if (!query || results.length === 0) return [];

  const suggestions = new Set<string>();
  const tokens = tokenize(query);

  // Suggest from top result titles
  for (const r of results.slice(0, 3)) {
    const titleTokens = tokenize(r.title);
    for (const tt of titleTokens) {
      if (!tokens.includes(tt) && tt.length > 2) {
        suggestions.add(`${query} ${tt}`);
      }
    }
  }

  // Suggest common next words
  const commonNext = ["bug", "fix", "feature", "update", "error", "crash", "performance", "security", "documentation"];
  for (const word of commonNext) {
    if (!tokens.includes(word)) {
      suggestions.add(`${query} ${word}`);
    }
  }

  return Array.from(suggestions).slice(0, 5);
}
