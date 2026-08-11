import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@gritgauge.dev" },
    update: {},
    create: {
      email: "demo@gritgauge.dev",
      name: "Demo Maintainer",
      githubLogin: "demo-maintainer",
      role: "MAINTAINER",
      settings: {
        create: {
          theme: "DARK",
          emailNotifications: true,
          maxDailyApiCalls: 500,
        },
      },
    },
  });

  // Create demo saved repos
  const repos = [
    { owner: "facebook", name: "react", fullName: "facebook/react", stars: 228000, forks: 46000, language: "JavaScript" },
    { owner: "vercel", name: "next.js", fullName: "vercel/next.js", stars: 125000, forks: 27000, language: "TypeScript" },
    { owner: "tiangolo", name: "fastapi", fullName: "tiangolo/fastapi", stars: 76000, forks: 6400, language: "Python" },
  ];

  for (const repo of repos) {
    await prisma.savedRepo.upsert({
      where: { userId_fullName: { userId: user.id, fullName: repo.fullName } },
      update: { stars: repo.stars, forks: repo.forks },
      create: {
        userId: user.id,
        ...repo,
        description: `${repo.name} — open-source project`,
        isMonitored: true,
      },
    });
  }

  // Create demo notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: "triage_complete",
        title: "Issue triage completed",
        body: "15 issues have been triaged for facebook/react. 2 critical, 5 high priority.",
        read: false,
      },
      {
        userId: user.id,
        type: "review_ready",
        title: "PR review ready",
        body: "AI review completed for PR #325 in vercel/next.js. Low risk — recommend approval.",
        read: false,
      },
      {
        userId: user.id,
        type: "health_alert",
        title: "Health score dropping",
        body: "tiangolo/fastapi health score dropped to 72. Stale issue ratio exceeded 25%.",
        read: true,
      },
    ],
  });

  console.log("✅ Seed complete!");
  console.log(`   User: ${user.email}`);
  console.log(`   Repos: ${repos.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
