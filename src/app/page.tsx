"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Bot,
  GitPullRequest,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Code2,
  Sparkles,
  Globe,
  Terminal,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Issue Triage",
    description:
      "Auto-label, prioritize, and summarize incoming issues. Detect duplicates and sentiment — cut triage time by 80%.",
    color: "text-brand-400",
    bg: "bg-brand-500/10",
  },
  {
    icon: GitPullRequest,
    title: "PR Review Assistant",
    description:
      "Instant AI-powered code review summaries, risk assessment, and change analysis. Never let a PR stall again.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: BarChart3,
    title: "Project Health Dashboard",
    description:
      "Track bus factor, response times, stale items, and contributor momentum. Know your project's pulse at a glance.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Terminal,
    title: "Changelog Generator",
    description:
      "Auto-generate clean, categorized changelogs from merged PRs. Ship release notes in seconds, not hours.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Security Spotlight",
    description:
      "Flag potential vulnerability patterns in PRs. Early warnings for sensitive file changes and risky dependencies.",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: Globe,
    title: "Community Insights",
    description:
      "Track contributor diversity, first-time contributor ratio, and community growth trends. Build a healthier community.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Connect Your Repo",
    description:
      "Paste any public GitHub repo URL. No auth needed for public repos — we fetch issues, PRs, and metrics instantly.",
  },
  {
    step: "2",
    title: "AI Analyzes Everything",
    description:
      "Our AI engine triages every open issue, reviews every pending PR, and computes your project's health score.",
  },
  {
    step: "3",
    title: "Take Action",
    description:
      "Review AI suggestions, apply labels, assign issues, merge with confidence. Export changelogs and health reports.",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
            <div className="text-center max-w-3xl mx-auto animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-brand-300 font-medium">
                  AI-Powered Open Source Maintainer Tools
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Maintain Smarter,
                <br />
                <span className="gradient-text">Not Harder</span>
              </h1>

              <p className="mt-6 text-lg text-surface-300 leading-relaxed max-w-2xl mx-auto">
                GritGauge is the AI co-pilot for open-source maintainers.
                Automate issue triage, get instant PR reviews, track project
                health, and generate changelogs — all in one dashboard.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/dashboard" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                  Try It Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-lg px-8 py-4 flex items-center gap-2"
                >
                  <Code2 className="w-5 h-5" />
                  View on GitHub
                </a>
              </div>

              {/* Stats */}
              <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
                <div>
                  <div className="text-2xl font-bold text-white">80%</div>
                  <div className="text-sm text-surface-400">Faster Triage</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">3min</div>
                  <div className="text-sm text-surface-400">PR Review Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-sm text-surface-400">Open Source</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Everything a Maintainer Needs
              </h2>
              <p className="mt-4 text-surface-400 max-w-xl mx-auto">
                Six powerful modules designed to eliminate the tedious parts of
                open-source maintenance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="card group hover:border-brand-500/30 cursor-default"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-surface-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-surface-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                How It Works
              </h2>
              <p className="mt-4 text-surface-400">
                Three steps to supercharge your open-source workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {howItWorks.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-surface-400 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="card border-brand-500/20 bg-gradient-to-b from-brand-500/5 to-transparent">
              <Zap className="w-12 h-12 text-brand-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Ship Faster?
              </h2>
              <p className="text-surface-300 mb-8 max-w-md mx-auto">
                Join open-source maintainers using GritGauge to cut through the
                noise and focus on building great software.
              </p>
              <Link href="/dashboard" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
                Launch Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
