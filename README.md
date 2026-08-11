# GritGauge

**AI-powered co-pilot for open-source maintainers — automate issue triage, PR review, security scanning, duplicate detection, release notes, and project insights.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/goranai/gritgauge/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/goranai/gritgauge?style=social)](https://github.com/goranai/gritgauge/stargazers)
[![CI](https://github.com/goranai/gritgauge/actions/workflows/ci.yml/badge.svg)](https://github.com/goranai/gritgauge/actions/workflows/ci.yml)
**Live: [gritgauge.vercel.app](https://gritgauge.vercel.app)**

---

## What it does

GritGauge eliminates the tedious parts of open-source maintenance. Enter any public GitHub repo and get instant AI-powered analysis across 7 modules — all backed by real-time GitHub data.

### 7 AI-Powered Modules

| Module | What it does |
|--------|-------------|
| **Triage** | AI analyzes every open issue — assigns priority (critical/high/medium/low), estimates effort, suggests labels, detects sentiment |
| **Review** | AI reviews each PR — risk level assessment, key changes summary, merge recommendation (approve/comment/request changes) |
| **Dedup** | AI scans all issues and detects exact duplicates and similar reports with explanations |
| **Security** | Full security audit — risk score, vulnerability detection, dependency analysis, prioritized remediation steps |
| **Release Notes** | AI generates professional release notes from merged PRs — highlights, features, bug fixes, breaking changes, contributors |
| **Changelog** | AI-powered changelog generation grouped by category (features, fixes, docs, maintenance) |
| **Insights** | AI benchmarks repo against industry standards, forecasts 6-month trends, provides 5 actionable recommendations |

### Dashboard

- Live GitHub data for any public repo (stars, forks, issues, PRs, contributors)
- Compare repositories side-by-side with radar charts
- Health metrics: bus factor, stale issue ratio, response time, contributor trends
- Settings: theme, notifications, automation preferences

### Also Included

| Component | Description |
|-----------|-------------|
| **REST API** | 16 endpoints for triage, review, dedup, security, insights, release notes, export, webhooks, etc. |
| **TypeScript SDK** | Full typed SDK for integrating GritGauge into Node.js apps |
| **Python SDK** | Python client for the GritGauge API |
| **Go SDK** | Go client for the GritGauge API |
| **CLI Tool** | Command-line interface with 5 commands: triage, review, health, changelog, compare |
| **VS Code Extension** | Sidebar integration with tree views and 8 commands |
| **Chrome Extension** | Health badges and inline triage on GitHub |
| **i18n** | 10 languages supported |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI Engine | OpenAI / DeepSeek (GPT-4o-mini / deepseek-chat) |
| GitHub Data | Octokit (REST API) + GraphQL |
| Authentication | NextAuth.js (GitHub OAuth + JWT) |
| Database | PostgreSQL (Prisma ORM) |
| Charts | Recharts |
| Deployment | Vercel, Docker |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/github?repo=owner/repo` | Fetch repo info, issues, PRs, contributors |
| POST | `/api/triage` | AI issue triage — priority, labels, effort |
| POST | `/api/review` | AI PR review — risk, key changes |
| POST | `/api/dedup` | AI duplicate detection across issues |
| POST | `/api/security` | AI security audit — vulnerabilities, risks |
| POST | `/api/release-notes` | AI release notes from PRs |
| POST | `/api/insights` | AI benchmarks, predictions, recommendations |
| POST | `/api/export` | Export reports (CSV, JSON, Markdown) |
| GET | `/api/health` | System health check |

---

## Running Locally

Requirements: Node.js 18+, GitHub OAuth app, and an AI API key (OpenAI or DeepSeek).

```bash
cp .env.example .env.local
# Fill in: GITHUB_ID, GITHUB_SECRET, NEXTAUTH_SECRET, OPENAI_API_KEY (or DEEPSEEK_API_KEY), DATABASE_URL
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
