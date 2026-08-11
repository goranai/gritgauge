# GritGauge Documentation

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [AI Features](#ai-features)
5. [Plugin Development](#plugin-development)
6. [Self-Hosting](#self-hosting)
7. [Contributing](#contributing)
8. [FAQ](#faq)

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (or SQLite for development)
- GitHub account (for OAuth and API access)
- OpenAI API key (for AI features)

### Installation

```bash
git clone https://github.com/your-username/gritgauge.git
cd gritgauge
npm install
cp .env.example .env.local
# Edit .env.local with your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | NextAuth secret (32+ chars) |
| `GITHUB_ID` | For Auth | GitHub OAuth App ID |
| `GITHUB_SECRET` | For Auth | GitHub OAuth App Secret |
| `GITHUB_TOKEN` | Recommended | GitHub Personal Access Token |
| `OPENAI_API_KEY` | For AI | OpenAI API key |
| `RESEND_API_KEY` | Optional | For email notifications |
| `REDIS_URL` | Optional | For Redis caching |

---

## Architecture

GritGauge follows a modular monolith architecture:

```
Client (Browser/CLI/IDE)
    ↓
Next.js App Router
    ├── Pages (SSR/CSR)
    └── API Routes (REST)
        ├── Services Layer
        │   ├── github/     (API + GraphQL + Webhooks)
        │   ├── ai          (OpenAI integration)
        │   ├── analytics   (Health metrics)
        │   ├── predictive  (Forecasting)
        │   ├── security    (Vulnerability scanning)
        │   ├── billing     (Stripe)
        │   ├── team        (Collaboration)
        │   ├── plugin      (Extension system)
        │   ├── scheduler   (Background jobs)
        │   ├── monitoring  (Observability)
        │   └── export      (Report generation)
        └── Database (Prisma ORM)
            └── PostgreSQL
```

### Key Design Decisions

1. **Server Components by default** — Pages use React Server Components; client interactivity is explicit with `"use client"`
2. **Zod validation** — All API inputs validated with Zod schemas
3. **Rate limiting** — In-memory rate limiter on all `/api/*` routes
4. **Caching** — In-memory cache with TTL; Redis support available
5. **Security** — CSP headers, CSRF protection, input sanitization, encrypted secrets

---

## API Reference

### Authentication

All API endpoints (except `/api/health` and `/api/github`) require authentication via NextAuth session or API key.

**Headers:**
```
Authorization: Bearer <api_key>
```

### Endpoints

#### Repository Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/github?repo=owner/repo` | Fetch repo info, issues, PRs |
| `GET` | `/api/repos` | List saved repos |
| `POST` | `/api/repos` | Save a repo for monitoring |
| `DELETE` | `/api/repos?id=<id>` | Remove a saved repo |

#### AI Triage
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/triage` | Run AI triage on a single issue |

**Request Body:**
```json
{
  "title": "Bug: App crashes on login",
  "issueBody": "When clicking login button...",
  "existingLabels": ["bug"]
}
```

#### AI Review
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/review` | Run AI review on a PR |

#### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics?repoId=<id>` | Get health metrics |
| `GET` | `/api/compare?repoId=<id1>&repoId=<id2>` | Compare repos |

#### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/export` | Generate and download reports |

#### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List notifications |
| `PUT` | `/api/notifications` | Mark as read |

#### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get user settings |
| `PUT` | `/api/settings` | Update user settings |

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin?section=health` | System health |
| `GET` | `/api/admin?section=usage` | Usage report |
| `POST` | `/api/admin` | Trigger job / acknowledge alert |

---

## AI Features

### Issue Triage
Uses GPT-4o-mini to analyze issues and return:
- Priority (critical/high/medium/low)
- Suggested labels
- Estimated effort
- Duplicate detection
- Sentiment analysis
- First step suggestion

### PR Review
Analyzes pull requests for:
- Risk level assessment
- Key changes summary
- Potential issues
- Test coverage notes
- Security flags
- Code quality score

### Security Scanning
Three scan types:
1. **PR Scan** — Analyzes code diff for vulnerabilities
2. **Dependency Scan** — Checks packages for known CVEs
3. **Full Audit** — Comprehensive security assessment

### Changelog Generator
Automatically generates categorized changelogs from merged PRs:
- 🚀 Features
- 🐛 Bug Fixes
- 📚 Documentation
- 🔧 Maintenance
- ⚡ Performance

---

## Plugin Development

GritGauge supports a plugin system for extending functionality.

### Plugin Manifest
```json
{
  "id": "my-custom-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "hooks": ["onTriageComplete", "onReviewComplete"],
  "runtime": "http",
  "entrypoint": "https://my-plugin.com/handler"
}
```

### Available Hooks
- `onTriageComplete` — After AI triage finishes
- `onReviewComplete` — After PR review completes
- `onHealthSnapshot` — When health snapshot is saved
- `onSecurityScan` — After security scan
- `onIssueOpened` — When a new issue is detected
- `onPROpened` — When a new PR is detected

### Plugin Runtime Options
1. **HTTP** — Plugin runs as an external web service
2. **JavaScript** — Sandboxed JS execution

---

## Self-Hosting

### Docker (Recommended)
```bash
docker-compose up -d
```

This starts:
- GritGauge app on port 3000
- PostgreSQL on port 5432
- Redis on port 6379

### Manual Deployment

1. Build: `npm run build`
2. Start: `npm start`
3. Ensure PostgreSQL is running and `DATABASE_URL` is set

### Vercel (One-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## FAQ

**Q: Do I need an OpenAI API key?**
A: The app works without it for basic GitHub data viewing. AI features (triage, review, security) require an API key.

**Q: What does it cost to run?**
A: Using GPT-4o-mini, typical cost is ~$0.05-0.50/day depending on usage. The free tier of OpenAI credits is usually enough for individual use.

**Q: Can I use my own AI model?**
A: Currently only OpenAI models are supported. Local model support (Ollama, etc.) is on the roadmap.

**Q: Is my data safe?**
A: GritGauge does not store your code. It stores metadata (issue titles, PR titles, health scores) in your database. API keys are encrypted at rest.

**Q: How do I get the Codex for OSS offer?**
A: If you maintain an active open-source project, apply at [openai.com/form/codex-for-oss](https://openai.com/form/codex-for-oss/).
