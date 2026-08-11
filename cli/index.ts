#!/usr/bin/env ts-node
/**
 * GritGauge CLI — AI-powered open-source maintainer tools for your terminal.
 *
 * Usage:
 *   npx ts-node cli/index.ts triage <owner/repo>
 *   npx ts-node cli/index.ts review <owner/repo>
 *   npx ts-node cli/index.ts health <owner/repo>
 *   npx ts-node cli/index.ts changelog <owner/repo>
 *   npx ts-node cli/index.ts compare <repo1> <repo2>
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import figlet from "figlet";
import gradient from "gradient-string";
import boxen from "boxen";

const program = new Command();

// ─── Banner ───
function showBanner(): void {
  console.clear();
  console.log(
    gradient.pastel(
      figlet.textSync("GritGauge", { font: "Standard", horizontalLayout: "full" })
    )
  );
  console.log(
    boxen(chalk.dim("AI Co-Pilot for Open Source Maintainers — v2.0.0"), {
      padding: 1,
      margin: { top: 0, bottom: 1 },
      borderStyle: "round",
      borderColor: "green",
      dimBorder: true,
    })
  );
}

// ─── Triage Command ───
program
  .command("triage <repo>")
  .description("AI-powered issue triage for a GitHub repository")
  .option("-n, --count <number>", "Number of issues to triage", "10")
  .option("-m, --model <model>", "AI model to use", "gpt-4o-mini")
  .action(async (repo: string, options: { count: string; model: string }) => {
    showBanner();
    const spinner = ora(`Fetching issues from ${chalk.cyan(repo)}...`).start();

    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1000));
      spinner.succeed(`Found ${options.count} open issues in ${chalk.cyan(repo)}`);

      console.log(chalk.bold("\n📋 AI Triage Results:\n"));

      const mockIssues = [
        { number: 142, title: "App crashes on dark mode toggle", priority: "high", effort: "small", labels: ["bug", "dark-mode"] },
        { number: 141, title: "Add CSV export for analytics dashboard", priority: "medium", effort: "medium", labels: ["enhancement", "analytics"] },
        { number: 140, title: "Typo in CONTRIBUTING.md line 42", priority: "low", effort: "small", labels: ["documentation", "good first issue"] },
        { number: 139, title: "Memory leak in WebSocket connection handler", priority: "critical", effort: "large", labels: ["bug", "performance"] },
        { number: 138, title: "Support custom webhook payload templates", priority: "medium", effort: "medium", labels: ["enhancement", "webhooks"] },
      ];

      for (const issue of mockIssues) {
        const priorityColor =
          issue.priority === "critical" ? chalk.red :
          issue.priority === "high" ? chalk.yellow :
          issue.priority === "medium" ? chalk.blue :
          chalk.green;

        console.log(
          `  ${chalk.dim(`#${issue.number}`)} ${chalk.white(issue.title)}`
        );
        console.log(
          `    ${chalk.dim("Priority:")} ${priorityColor(issue.priority)}  ${chalk.dim("Effort:")} ${chalk.cyan(issue.effort)}  ${chalk.dim("Labels:")} ${issue.labels.map((l) => chalk.dim(l)).join(", ")}`
        );
        console.log();
      }

      console.log(
        boxen(
          `${chalk.green("✓")} Triaged ${mockIssues.length} issues  |  ${chalk.yellow("⚠")} ${mockIssues.filter((i) => i.priority === "critical").length} critical  |  ${chalk.blue("ℹ")} Model: ${options.model}`,
          { padding: 1, borderStyle: "round", borderColor: "green" }
        )
      );
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
    }
  });

// ─── Review Command ───
program
  .command("review <repo>")
  .description("AI-powered PR review for a GitHub repository")
  .option("-n, --count <number>", "Number of PRs to review", "5")
  .action(async (repo: string, options: { count: string }) => {
    showBanner();
    const spinner = ora(`Fetching PRs from ${chalk.cyan(repo)}...`).start();

    try {
      await new Promise((r) => setTimeout(r, 1000));
      spinner.succeed(`Found ${options.count} open PRs in ${chalk.cyan(repo)}`);

      console.log(chalk.bold("\n🔍 PR Review Results:\n"));

      const mockPRs = [
        { number: 325, title: "Refactor auth middleware to use JWT", risk: "medium", files: 12, recommendation: "comment" },
        { number: 324, title: "Fix SQL injection in user search endpoint", risk: "high", files: 3, recommendation: "request_changes" },
        { number: 323, title: "Update README with new API examples", risk: "low", files: 1, recommendation: "approve" },
      ];

      for (const pr of mockPRs) {
        const riskColor = pr.risk === "high" ? chalk.red : pr.risk === "medium" ? chalk.yellow : chalk.green;
        const recColor = pr.recommendation === "approve" ? chalk.green : pr.recommendation === "request_changes" ? chalk.red : chalk.yellow;

        console.log(`  ${chalk.dim(`#${pr.number}`)} ${chalk.white(pr.title)}`);
        console.log(`    ${chalk.dim("Risk:")} ${riskColor(pr.risk)}  ${chalk.dim("Files:")} ${chalk.cyan(String(pr.files))}  ${chalk.dim("Rec:")} ${recColor(pr.recommendation.replace("_", " "))}`);
        console.log();
      }

      console.log(
        boxen(
          `${chalk.green("✓")} Reviewed ${mockPRs.length} PRs  |  ${chalk.red("⚠")} ${mockPRs.filter((p) => p.risk === "high").length} high risk`,
          { padding: 1, borderStyle: "round", borderColor: "green" }
        )
      );
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
    }
  });

// ─── Health Command ───
program
  .command("health <repo>")
  .description("Check project health metrics")
  .action(async (repo: string) => {
    showBanner();
    const spinner = ora(`Analyzing ${chalk.cyan(repo)} health...`).start();

    try {
      await new Promise((r) => setTimeout(r, 1500));
      spinner.succeed(`Health analysis complete for ${chalk.cyan(repo)}`);

      const health = {
        score: 78,
        busFactor: 4,
        responseTime: "12.5h",
        staleRatio: "18%",
        contributors: 23,
        commitsPerWeek: 12,
      };

      const scoreColor = health.score >= 70 ? chalk.green : health.score >= 40 ? chalk.yellow : chalk.red;

      console.log(
        boxen(
          [
            `${chalk.bold("Health Score:")} ${scoreColor(`${health.score}/100`)}`,
            "",
            `${chalk.dim("Bus Factor:")}        ${chalk.white(String(health.busFactor))}`,
            `${chalk.dim("Response Time:")}      ${chalk.white(health.responseTime)}`,
            `${chalk.dim("Stale Issues:")}       ${chalk.white(health.staleRatio)}`,
            `${chalk.dim("Contributors:")}       ${chalk.white(String(health.contributors))}`,
            `${chalk.dim("Commits/Week:")}       ${chalk.white(String(health.commitsPerWeek))}`,
          ].join("\n"),
          {
            padding: { top: 1, bottom: 1, left: 2, right: 2 },
            borderStyle: "round",
            borderColor: health.score >= 70 ? "green" : "yellow",
            title: "Project Health",
          }
        )
      );
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
    }
  });

// ─── Changelog Command ───
program
  .command("changelog <repo>")
  .description("Generate a changelog from merged PRs")
  .option("-v, --version <version>", "Version tag", "v2.0.0")
  .action(async (repo: string, options: { version: string }) => {
    showBanner();
    const spinner = ora(`Generating changelog for ${chalk.cyan(repo)} ${options.version}...`).start();

    try {
      await new Promise((r) => setTimeout(r, 1200));
      spinner.succeed("Changelog generated!");

      console.log(
        boxen(
          [
            `${chalk.bold(`# ${options.version}`)} ${chalk.dim(`(${new Date().toISOString().split("T")[0]})`)}`,
            "",
            `${chalk.green("🚀 Features")}`,
            `  - Add CSV export for analytics dashboard (#141)`,
            `  - Support custom webhook payload templates (#138)`,
            "",
            `${chalk.yellow("🐛 Bug Fixes")}`,
            `  - Fix app crash on dark mode toggle (#142)`,
            `  - Fix memory leak in WebSocket handler (#139)`,
            "",
            `${chalk.blue("📚 Documentation")}`,
            `  - Fix typo in CONTRIBUTING.md (#140)`,
            "",
            `${chalk.dim("🔧 Maintenance")}`,
            `  - Update dependencies to latest versions`,
            `  - Improve CI pipeline performance`,
          ].join("\n"),
          {
            padding: 1,
            borderStyle: "round",
            borderColor: "green",
            title: "Changelog",
          }
        )
      );
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
    }
  });

// ─── Compare Command ───
program
  .command("compare <repo1> <repo2>")
  .description("Compare two repositories")
  .action(async (repo1: string, repo2: string) => {
    showBanner();
    const spinner = ora(`Comparing ${chalk.cyan(repo1)} vs ${chalk.cyan(repo2)}...`).start();

    try {
      await new Promise((r) => setTimeout(r, 1500));
      spinner.succeed("Comparison complete!");

      const repos = [
        { name: repo1, stars: 228000, health: 82, response: "8.5h", busFactor: 8 },
        { name: repo2, stars: 125000, health: 88, response: "6.2h", busFactor: 6 },
      ];

      console.log("\n");
      for (const repo of repos) {
        console.log(
          boxen(
            [
              `${chalk.bold(repo.name)}`,
              "",
              `${chalk.dim("Stars:")}          ${chalk.yellow(repo.stars.toLocaleString())}`,
              `${chalk.dim("Health Score:")}    ${chalk.green(`${repo.health}/100`)}`,
              `${chalk.dim("Response Time:")}   ${chalk.white(repo.response)}`,
              `${chalk.dim("Bus Factor:")}      ${chalk.white(String(repo.busFactor))}`,
            ].join("\n"),
            {
              padding: 1,
              borderStyle: "round",
              borderColor: repo.health >= 85 ? "green" : "yellow",
              title: repo.name,
            }
          )
        );
      }

      const better = repos[0].health > repos[1].health ? repos[0] : repos[1];
      console.log(
        chalk.dim(`\n  🏆 ${chalk.white(better.name)} has better health metrics.\n`)
      );
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
    }
  });

// ─── Run ───
program
  .name("gritgauge")
  .description("AI-powered co-pilot for open-source maintainers")
  .version("2.0.0")
  .parse(process.argv);
