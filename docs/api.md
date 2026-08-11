# GritGauge API Reference

## Base URL
```
https://your-instance.com/api
```

## Authentication

### API Key Authentication
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://your-instance.com/api/repos
```

### Session Authentication (Browser)
Uses NextAuth.js session cookies. Automatically handled when logged in via the web app.

---

## Endpoints

### GET /api/github

Fetch repository data from GitHub.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `repo` | string | Yes | Repository in `owner/repo` format |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "repo": {
      "fullName": "facebook/react",
      "stars": 228000,
      "forks": 46000,
      "openIssues": 850,
      "openPRs": 120,
      "language": "JavaScript",
      "topics": ["ui", "library", "frontend"],
      "license": "MIT"
    },
    "issues": [...],
    "pullRequests": [...],
    "contributors": [...]
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 400 | Missing `repo` parameter |
| 400 | Invalid repo format |
| 500 | GitHub API error |

---

### POST /api/triage

Run AI-powered issue triage.

**Request Body:**
```json
{
  "title": "App crashes on dark mode toggle",
  "issueBody": "When switching to dark mode, the app crashes with TypeError: null is not an object...",
  "existingLabels": ["bug"],
  "model": "gpt-4o-mini"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Issue title (max 500 chars) |
| `issueBody` | string | No | Issue description |
| `existingLabels` | string[] | No | Current labels |
| `model` | string | No | AI model (default: gpt-4o-mini) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "issueNumber": 142,
    "suggestedLabels": ["bug", "dark-mode", "high-priority"],
    "priority": "high",
    "estimatedEffort": "small",
    "suggestedAssignee": "any-maintainer",
    "summary": "Null reference in theme provider when toggling dark mode",
    "isDuplicate": false,
    "sentiment": "neutral",
    "relatedIssues": [],
    "suggestedFirstStep": "Check ThemeProvider initialization for null safety"
  }
}
```

---

### POST /api/review

Run AI-powered PR review.

**Request Body:**
```json
{
  "title": "Add authentication middleware",
  "prBody": "Implements JWT-based auth for all API routes...",
  "filesChanged": 12,
  "additions": 340,
  "deletions": 85,
  "model": "gpt-4o-mini"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "prNumber": 0,
    "summary": "Adds JWT auth middleware to protect API routes...",
    "riskLevel": "medium",
    "suggestedReviewers": ["security-reviewer", "backend-reviewer"],
    "keyChanges": ["Added JWT verification middleware", "Protected all API routes"],
    "potentialIssues": ["Token expiration not configurable", "No refresh token mechanism"],
    "testCoverageNote": "Unit tests for middleware exist, integration tests recommended",
    "recommendation": "comment",
    "codeQualityScore": 78,
    "securityFlags": []
  }
}
```

---

### GET /api/analytics

Get project health metrics.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `repoId` | string | Yes | Saved repo ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "healthScore": 78,
    "busFactor": 4,
    "responseTimeAvg": 12.5,
    "staleIssueRatio": 0.18,
    "prMergeTimeAvg": 36.2,
    "contributorCount": 23,
    "commitFrequency": 12,
    "trends": {
      "issuesTrend": "down",
      "prsTrend": "stable",
      "contributorsTrend": "up"
    },
    "details": {
      "issueResolutionRate": 0.72,
      "prAcceptanceRate": 0.85,
      "firstTimeContributorRatio": 0.18,
      "contributorRetentionRate": 0.73
    }
  }
}
```

---

### POST /api/export

Generate and download a report.

**Request Body:**
```json
{
  "repoId": "clx123abc",
  "type": "health",
  "format": "markdown",
  "title": "Monthly Health Report"
}
```

**Formats:** `pdf`, `csv`, `json`, `markdown`

**Types:** `health`, `activity`, `security`, `custom`

---

### GET /api/compare

Compare multiple repositories.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `repoId` | string[] | Yes | At least 2 repo IDs |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "repos": [
      { "fullName": "facebook/react", "healthScore": 82, "stars": 228000 },
      { "fullName": "vuejs/vue", "healthScore": 78, "stars": 207000 }
    ],
    "comparison": {
      "mostPopular": "facebook/react",
      "healthiest": "facebook/react"
    }
  }
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "meta": {
    "code": "RATE_LIMIT",
    "retryAfter": 30
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `GITHUB_API_ERROR` | 502 | GitHub API failure |
| `AI_SERVICE_ERROR` | 503 | OpenAI API failure |

---

## Rate Limits

- **Free tier:** 300 requests/minute
- **Pro tier:** 1,000 requests/minute
- **Team tier:** 5,000 requests/minute
- **Enterprise:** Custom limits

Rate limit headers are included in every response:
```
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1692000000
```

---

## SDK Usage

### JavaScript/TypeScript
```typescript
import { createClient } from "gritgauge-sdk";

const client = createClient({ apiUrl: "https://your-instance.com", apiKey: "..." });

const repo = await client.getRepo("facebook", "react");
const triage = await client.triageIssue("Bug report", "Description...");
const review = await client.reviewPR("New feature", "PR description...", 5, 200, 50);
```

### cURL Examples
```bash
# Triage an issue
curl -X POST https://your-instance.com/api/triage \
  -H "Content-Type: application/json" \
  -d '{"title":"Broken login","issueBody":"Users cannot log in..."}'

# Export health report
curl -X POST https://your-instance.com/api/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"repoId":"clx123","type":"health","format":"markdown","title":"Report"}'
```
