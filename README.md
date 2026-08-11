# GritGauge

**AI-powered tools for open-source maintainers — issue triage, PR reviews, security scanning, and project health tracking.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/goranai/gritgauge/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/goranai/gritgauge?style=social)](https://github.com/goranai/gritgauge/stargazers)

---

## What is GritGauge?

GritGauge handles the repetitive maintenance work that eats up your time — triaging issues, reviewing PRs, tracking project health, and generating changelogs. It uses AI to do the heavy lifting so you can focus on actually writing code.

Free and open source under MIT.

### The Problem

Maintainers spend too much time on:
- Issues piling up with no labels, no priority, no owner
- PRs sitting unreviewed for weeks
- No clear picture of project health — bus factor, response times, contributor churn
- Manually writing changelogs for every release

### What GritGauge Does

- AI triages your issues — labels them, prioritizes them, detects duplicates, reads sentiment
- AI reviews your PRs — risk assessment, change summaries, flags potential problems
- Real-time health dashboard — bus factor, stale issue ratio, response times, contributor trends
- Auto-generated changelogs from merged PRs

---

## ✨ Features

| Module | What it does |
|--------|-------------|
| AI Issue Triage | Auto-label, prioritize, detect duplicates, analyze sentiment |
| PR Review Assistant | Risk assessment, change summaries, flags security concerns |
| Health Dashboard | Bus factor, response time, stale ratio, contributor trends |
| Changelog Generator | Categorized changelogs from merged PRs |
| Security Spotlight | Flag risky file changes and dependency vulnerabilities |
| Community Insights | Contributor stats, first-time contributor tracking |

---

## 🖥️ Demo

<p align="center">
  <em>Screenshot coming soon — or run it locally in 2 minutes!</em>
</p>

### Try These Repos:
- `facebook/react`
- `vercel/next.js`
- `tiangolo/fastapi`
- `microsoft/vscode`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **GitHub API** | [Octokit](https://github.com/octokit/octokit.js) |
| **AI Engine** | [OpenAI API](https://platform.openai.com/) (GPT-4o-mini) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Deployment** | [Vercel](https://vercel.com/) (recommended) |

---

## Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- A **GitHub Personal Access Token** (for higher API rate limits)
- An **OpenAI API Key** (for AI features)

### 1. Clone & Install

```bash
git clone https://github.com/goranai/gritgauge.git
cd gritgauge
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your keys:

```env
# Required for AI features
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional — GitHub token for higher rate limits (5000 req/hr vs 60)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/github?repo=owner/repo` | Fetch repo info, issues, PRs, contributors |
| `POST` | `/api/triage` | AI-powered issue triage |
| `POST` | `/api/review` | AI-powered PR review |

### Example: Triage an Issue

```bash
curl -X POST http://localhost:3000/api/triage \
  -H "Content-Type: application/json" \
  -d '{
    "title": "App crashes on dark mode toggle",
    "issueBody": "When switching to dark mode, the app crashes with a null pointer...",
    "existingLabels": ["bug"]
  }'
```

**Response:**
```json
{
  "issueNumber": 0,
  "suggestedLabels": ["bug", "dark-mode", "high-priority", "good first issue"],
  "priority": "high",
  "estimatedEffort": "small",
  "suggestedAssignee": "any-maintainer",
  "summary": "Null pointer crash when toggling dark mode, likely a missing null check in the theme provider.",
  "isDuplicate": false,
  "duplicateOf": null,
  "sentiment": "neutral"
}
```

---

## 🏗️ Project Structure

```
gritgauge/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── github/route.ts    # GitHub data API
│   │   │   ├── triage/route.ts    # AI triage API
│   │   │   └── review/route.ts    # AI review API
│   │   ├── dashboard/page.tsx     # Main dashboard page
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── Header.tsx             # Navigation header
│   │   ├── Footer.tsx             # Site footer
│   │   ├── RepoInput.tsx          # Repository URL input
│   │   ├── IssueTriagePanel.tsx   # AI issue triage UI
│   │   ├── PRReviewPanel.tsx      # PR review assistant UI
│   │   └── HealthMetricsPanel.tsx # Health metrics display
│   ├── lib/
│   │   ├── github.ts              # GitHub API client (Octokit)
│   │   ├── ai.ts                  # OpenAI integration
│   │   └── utils.ts               # Shared utilities
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── public/                        # Static assets
├── .env.example                   # Environment template
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── README.md
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, code guidelines, and how to submit PRs.

## License

MIT — see [LICENSE](./LICENSE) for details.

## Acknowledgments

Built with Next.js, Tailwind CSS, and the OpenAI API. Inspired by the daily struggles of maintaining open-source projects.
