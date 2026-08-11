# Contributing to GritGauge

First off, thank you for considering contributing to GritGauge! 🎉

GritGauge is an AI-powered co-pilot for open-source maintainers, and we welcome contributions of all kinds — code, documentation, bug reports, feature ideas, and design improvements.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Labels](#issue-labels)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## How Can I Contribute?

### 🐛 Report Bugs
- Search existing issues first to avoid duplicates
- Use the **Bug Report** template
- Include: steps to reproduce, expected vs actual behavior, environment details

### 💡 Suggest Features
- Check the [Roadmap](#) to see if it's already planned
- Open a **Feature Request** issue
- Explain the problem you're solving and why it matters for maintainers

### 📚 Improve Documentation
- Fix typos, add examples, improve clarity
- Add JSDoc comments to functions
- Translate docs (coming soon)

### 💻 Write Code
- Look for issues tagged `good first issue` or `help wanted`
- Comment on the issue to claim it
- Follow the development setup below

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- GitHub Personal Access Token (optional, for higher rate limits)
- OpenAI API Key (for AI features)

### Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/gritgauge.git
cd gritgauge

# 2. Install dependencies
npm install

# 3. Copy environment config
cp .env.example .env.local

# 4. Add your API keys to .env.local
# OPENAI_API_KEY=sk-...
# GITHUB_TOKEN=ghp_...

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

See the [README](./README.md#-project-structure) for the full file tree.

Key directories:
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — Reusable React components
- `src/lib/` — Business logic (GitHub API, OpenAI, utilities)
- `src/types/` — TypeScript type definitions

---

## Coding Guidelines

### TypeScript
- Use **strict mode** — all types must be explicit
- Prefer `interface` over `type` for object shapes
- Use `async/await` over raw promises
- Handle errors gracefully — use try/catch with fallbacks

### React / Next.js
- Use **Server Components** by default, opt into `"use client"` only when needed
- Keep components focused — one responsibility per component
- Use Tailwind CSS utility classes (no custom CSS unless necessary)
- Use `cn()` from `@/lib/utils` for conditional classes

### API Routes
- Validate inputs at the top of each handler
- Return proper HTTP status codes
- Catch and sanitize errors — never leak stack traces

### Naming
- **Files**: `PascalCase` for components, `kebab-case` for utilities
- **Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

**Examples**:
- `feat(triage): add duplicate issue detection`
- `fix(dashboard): correct health score calculation for repos with 0 issues`
- `docs(readme): add API usage examples`

---

## Pull Request Process

1. **Fork** the repo and create a feature branch: `git checkout -b feat/my-feature`
2. **Make your changes** — keep commits focused and atomic
3. **Test** — run `npm run type-check` and `npm run lint`
4. **Push** and open a Pull Request against `main`
5. **Describe** what you changed, why, and how to test it
6. **Link** any related issues using `Closes #123`

A maintainer will review your PR within 48 hours. We may suggest changes — that's normal and part of the collaborative process!

---

## Issue Labels

| Label | Meaning |
|-------|---------|
| `good first issue` | Great for newcomers |
| `help wanted` | We'd love community help |
| `bug` | Something isn't working |
| `enhancement` | New feature or improvement |
| `documentation` | Docs related |
| `performance` | Speed/optimization |
| `security` | Security-related |

---

## Questions?

Open a [Discussion](https://github.com/your-username/gritgauge/discussions) or reach out to the maintainers.

**Happy contributing!** 🚀
