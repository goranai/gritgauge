#!/usr/bin/env ts-node
/**
 * GritGauge Deployment & Maintenance Scripts
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ─── Database Migration ───

export function runMigrations(): void {
  console.log("🔄 Running database migrations...");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Migrations complete");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

export function generatePrismaClient(): void {
  console.log("🔧 Generating Prisma client...");
  try {
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Prisma client generated");
  } catch (error) {
    console.error("❌ Prisma generation failed:", error);
  }
}

export function seedDatabase(): void {
  console.log("🌱 Seeding database...");
  try {
    execSync("npx ts-node prisma/seed.ts", { stdio: "inherit" });
    console.log("✅ Database seeded");
  } catch (error) {
    console.error("❌ Seed failed:", error);
  }
}

// ─── Build & Deploy ───

export function buildProject(): void {
  console.log("🏗️ Building project...");
  try {
    execSync("npm run build", { stdio: "inherit" });
    console.log("✅ Build complete");
  } catch (error) {
    console.error("❌ Build failed:", error);
  }
}

export function deployToVercel(): void {
  console.log("🚀 Deploying to Vercel...");
  try {
    execSync("npx vercel --prod", { stdio: "inherit" });
    console.log("✅ Deployed to Vercel");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

// ─── Docker Operations ───

export function buildDockerImage(): void {
  console.log("🐳 Building Docker image...");
  try {
    execSync("docker build -t gritgauge:latest .", { stdio: "inherit" });
    console.log("✅ Docker image built");
  } catch (error) {
    console.error("❌ Docker build failed:", error);
  }
}

export function runDockerCompose(): void {
  console.log("🐳 Starting Docker Compose...");
  try {
    execSync("docker-compose up -d", { stdio: "inherit" });
    console.log("✅ Services running");
  } catch (error) {
    console.error("❌ Docker Compose failed:", error);
  }
}

// ─── Health Checks ───

export async function healthCheck(): Promise<void> {
  console.log("🏥 Running health checks...");

  const checks = [
    { name: "API", url: "http://localhost:3000/api/health" },
    { name: "Dashboard", url: "http://localhost:3000/dashboard" },
    { name: "Analytics", url: "http://localhost:3000/analytics" },
  ];

  for (const check of checks) {
    try {
      const response = await fetch(check.url);
      if (response.ok) {
        console.log(`  ✅ ${check.name}: OK (${response.status})`);
      } else {
        console.log(`  ⚠️ ${check.name}: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ ${check.name}: ${error}`);
    }
  }
}

// ─── Backup ───

export function backupDatabase(): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  console.log(`💾 Creating backup: ${backupFile}`);
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl.includes("postgresql")) {
      execSync(`pg_dump "${dbUrl}" > "${backupFile}"`, { stdio: "inherit" });
    } else {
      // For SQLite, just copy the file
      const dbPath = dbUrl.replace("file:", "");
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupFile);
      }
    }
    console.log("✅ Backup complete");
  } catch (error) {
    console.error("❌ Backup failed:", error);
  }
}

// ─── Cleanup ───

export function cleanupOldData(): void {
  console.log("🧹 Cleaning up old data...");
  try {
    // Remove old build artifacts
    const dirs = [".next", "node_modules/.cache"];
    for (const dir of dirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`  Removed: ${dir}`);
      }
    }
    console.log("✅ Cleanup complete");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}

// ─── Main ───

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "migrate":
      runMigrations();
      break;
    case "generate":
      generatePrismaClient();
      break;
    case "seed":
      seedDatabase();
      break;
    case "build":
      buildProject();
      break;
    case "deploy":
      deployToVercel();
      break;
    case "docker-build":
      buildDockerImage();
      break;
    case "docker-up":
      runDockerCompose();
      break;
    case "health":
      healthCheck();
      break;
    case "backup":
      backupDatabase();
      break;
    case "cleanup":
      cleanupOldData();
      break;
    case "setup": {
      generatePrismaClient();
      runMigrations();
      seedDatabase();
      buildProject();
      console.log("\n✅ Full setup complete! Run 'npm run dev' to start.");
      break;
    }
    default:
      console.log(`
GritGauge Deployment Scripts
=============================
Usage: npx ts-node scripts/deploy.ts <command>

Commands:
  migrate       Run database migrations
  generate      Generate Prisma client
  seed          Seed database with demo data
  build         Build production bundle
  deploy        Deploy to Vercel
  docker-build  Build Docker image
  docker-up     Start Docker Compose
  health        Run health checks
  backup        Backup database
  cleanup       Remove old build artifacts
  setup         Full setup (generate + migrate + seed + build)
`);
  }
}
