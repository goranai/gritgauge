# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in GritGauge, please **do not** open a public issue.

Instead, send an email to **security@gritgauge.dev** with:

- A detailed description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential mitigations you've identified

We will respond within **48 hours** and aim to publish a fix within **7 days**.

## Security Practices

GritGauge follows these security practices:

- **No secrets in code** — All credentials use environment variables
- **Input validation** — Zod schemas validate all API inputs
- **Rate limiting** — API endpoints are rate-limited per IP
- **SQL injection prevention** — Uses Prisma ORM with parameterized queries
- **XSS prevention** — React automatically escapes output; DOMPurify for rich content
- **CSRF protection** — NextAuth.js provides CSRF tokens for all mutations
- **Content Security Policy** — Strict CSP headers on all pages
- **Dependency scanning** — CI runs Trivy vulnerability scanner on every PR
- **No telemetry** — GritGauge does not collect or send any user data externally

## API Key Handling

- GitHub tokens: encrypted at rest in the database
- OpenAI keys: encrypted at rest, never exposed to client-side
- User API keys: hashed before storage
- All API communication: HTTPS only in production

## Responsible Disclosure

We appreciate responsible disclosure. If you report a vulnerability:

1. We will acknowledge receipt within 48 hours
2. We will provide a timeline for the fix
3. We will credit you in the release notes (unless you prefer anonymity)
4. We will not pursue legal action against researchers acting in good faith

Thank you for helping keep GritGauge and its users secure! 🛡️
