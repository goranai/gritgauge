# GritGauge

**Tools for open-source maintainers — issue triage, PR review, security scanning, project health tracking.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/goranai/gritgauge/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/goranai/gritgauge?style=social)](https://github.com/goranai/gritgauge/stargazers)
**Live: [gritgauge.vercel.app](https://gritgauge.vercel.app)**

---

## What it does

GritGauge handles repetitive maintenance work — triaging issues, reviewing PRs, tracking project health, generating changelogs. The goal is simple: spend less time on overhead, more time writing code.

### Why

Most open-source maintainers deal with the same problems:
- Issues pile up — no labels, no priority, nobody assigned
- PRs sit unreviewed for weeks
- No clear picture of project health — bus factor, response times, contributor activity
- Writing changelogs manually for every release

### How it helps

- Triage issues automatically — labels, priority, duplicate detection, sentiment check
- Review PRs with risk assessment, change summaries, and security flags
- Dashboard showing bus factor, stale issue ratio, response times, contributor trends
- Changelogs generated from merged PRs

---

## Features

| Module | What it does |
|--------|-------------|
| AI Issue Triage | Auto-label, prioritize, detect duplicates, analyze sentiment |
| PR Review Assistant | Risk assessment, change summaries, flags security concerns |
| Health Dashboard | Bus factor, response time, stale ratio, contributor trends |
| Changelog Generator | Categorized changelogs from merged PRs |
| Security Spotlight | Flag risky file changes and dependency vulnerabilities |
| Community Insights | Contributor stats, first-time contributor tracking |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| GitHub API | Octokit |
| AI Engine | OpenAI API (GPT-4o-mini) |
| Charts | Recharts |
| Database | PostgreSQL (Prisma ORM) |
| Deployment | Vercel, Docker |

---

## Running locally

You need Node.js 18+, a GitHub token, and an OpenAI API key.

Copy the env file and fill in your keys:
```
cp .env.example .env.local
```

Then:
```
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/github?repo=owner/repo` | Fetch repo info, issues, PRs, contributors |
| POST | `/api/triage` | AI-powered issue triage |
| POST | `/api/review` | AI-powered PR review |
| GET | `/api/analytics?repoId=id` | Project health metrics |
| POST | `/api/security` | Security vulnerability scan |
| GET | `/api/compare?repoId=a&repoId=b` | Compare repositories |
| POST | `/api/export` | Export reports (CSV, JSON, Markdown, PDF) |

Example — triage an issue:
```
curl -X POST http://localhost:3000/api/triage \
  -H "Content-Type: application/json" \
  -d '{"title": "App crashes on dark mode toggle", "issueBody": "When switching to dark mode, the app crashes...", "existingLabels": ["bug"]}'
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).

---

*This project uses AI (OpenAI GPT-4o-mini) for issue triage, PR review, and security scanning features. API credits are required to use those features.*
