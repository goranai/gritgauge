<p align="center">
  <img src="https://raw.githubusercontent.com/your-username/gritgauge/main/public/logo.svg" alt="GritGauge Logo" width="120" />
</p>

<h1 align="center">GritGauge</h1>

<p align="center">
  <strong>AI Co-Pilot for Open-Source Maintainers</strong>
</p>

<p align="center">
  <a href="https://github.com/your-username/gritgauge/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" />
  </a>
  <a href="https://github.com/your-username/gritgauge/stargazers">
    <img src="https://img.shields.io/github/stars/your-username/gritgauge?style=social" alt="Stars" />
  </a>
  <a href="https://github.com/your-username/gritgauge/issues">
    <img src="https://img.shields.io/github/issues/your-username/gritgauge" alt="Issues" />
  </a>
  <a href="https://github.com/your-username/gritgauge/pulls">
    <img src="https://img.shields.io/github/issues-pr/your-username/gritgauge" alt="Pull Requests" />
  </a>
</p>

---

## 🚀 What is GritGauge?

**GritGauge** is an AI-powered dashboard that helps open-source maintainers automate the tedious parts of project maintenance — issue triage, PR reviews, release changelogs, and project health monitoring.

Built with ❤️ for the open-source community. **100% free and open source.**

### 🎯 The Problem

Open-source maintainers are drowning in:
- 📥 **Hundreds of unread issues** with no labels or priority
- 🔍 **PRs sitting for weeks** waiting for review
- 📊 **No visibility** into project health, bus factor, or community trends
- 📝 **Hours spent writing changelogs** instead of shipping code

### 💡 The Solution

GritGauge uses **AI (OpenAI / ChatGPT)** to:
- Auto-triage issues with labels, priority, effort estimates, and sentiment analysis
- Generate instant PR review summaries with risk assessment
- Compute a real-time project health score
- Auto-generate categorized changelogs from merged PRs

---

## ✨ Features

| Module | Description | Status |
|--------|-------------|--------|
| **🤖 AI Issue Triage** | Auto-label, prioritize, detect duplicates, analyze sentiment | ✅ Stable |
| **🔍 PR Review Assistant** | Risk assessment, change summaries, suggested reviewers | ✅ Stable |
| **📊 Health Dashboard** | Bus factor, response time, stale ratio, contributor trends | ✅ Stable |
| **📝 Changelog Generator** | Categorized changelogs from merged PRs | 🚧 Beta |
| **🛡️ Security Spotlight** | Flag risky file changes and dependency vulnerabilities | 🚧 Beta |
| **🌐 Community Insights** | Contributor diversity, first-time contributor tracking | 🚧 Planned |

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

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- A **GitHub Personal Access Token** (for higher API rate limits)
- An **OpenAI API Key** (for AI features)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/gritgauge.git
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

## 🤝 Contributing

We love contributions! GritGauge is built for the community, by the community.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to set up the dev environment
- Code style guidelines
- How to submit issues and PRs
- Project roadmap

**Good First Issues** are tagged and ready for new contributors!

---

## 📜 License

MIT © [Your Name]

See [LICENSE](./LICENSE) for full details.

---

## ⭐ Support the Project

If GritGauge helps you maintain your open-source projects:

- **Star this repo** ⭐ — it helps others discover the project
- **Share it** with fellow maintainers
- **Contribute** — see [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Sponsor** — help us cover API costs and keep GritGauge free

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), and [Lucide Icons](https://lucide.dev/)
- Powered by [OpenAI](https://openai.com/) and [GitHub API](https://docs.github.com/en/rest)
- Inspired by the struggles of open-source maintainers everywhere ❤️

---

<p align="center">
  <strong>Maintain smarter, not harder.</strong><br/>
  <sub>Built with ❤️ for the open-source community</sub>
</p>
