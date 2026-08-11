import "@testing-library/jest-dom";

// Mock next/router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock Octokit
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: {
      get: jest.fn().mockResolvedValue({
        data: {
          owner: { login: "test-owner" },
          name: "test-repo",
          full_name: "test-owner/test-repo",
          description: "Test repository",
          stargazers_count: 100,
          forks_count: 20,
          open_issues_count: 10,
          language: "TypeScript",
          topics: ["testing"],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-06-01T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo",
        },
      }),
      listContributors: jest.fn().mockResolvedValue({
        data: [{ login: "user1", contributions: 50 }],
      }),
    },
    issues: {
      listForRepo: jest.fn().mockResolvedValue({
        data: [
          {
            number: 1,
            title: "Test bug",
            state: "open",
            labels: [{ name: "bug" }],
            assignee: null,
            created_at: "2024-06-01T00:00:00Z",
            updated_at: "2024-06-01T00:00:00Z",
            html_url: "https://github.com/test-owner/test-repo/issues/1",
            body: "Test issue body",
            user: { login: "user2" },
            pull_request: undefined,
          },
        ],
      }),
      get: jest.fn().mockResolvedValue({
        data: {
          number: 1,
          title: "Test bug",
          state: "open",
          labels: [{ name: "bug" }],
          assignee: null,
          created_at: "2024-06-01T00:00:00Z",
          updated_at: "2024-06-01T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo/issues/1",
          body: "Test issue body",
          user: { login: "user2" },
        },
      }),
    },
    pulls: {
      list: jest.fn().mockResolvedValue({
        data: [
          {
            number: 10,
            title: "Test PR",
            state: "open",
            user: { login: "user3" },
            created_at: "2024-06-01T00:00:00Z",
            updated_at: "2024-06-01T00:00:00Z",
            html_url: "https://github.com/test-owner/test-repo/pull/10",
            body: "Test PR body",
            additions: 50,
            deletions: 10,
            changed_files: 3,
          },
        ],
      }),
    },
  })),
}));

// Mock OpenAI
jest.mock("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suggestedLabels: ["bug", "high-priority"],
                  priority: "high",
                  estimatedEffort: "small",
                  summary: "Test AI summary",
                  isDuplicate: false,
                  sentiment: "neutral",
                  suggestedAssignee: "any-maintainer",
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

// Suppress console during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
