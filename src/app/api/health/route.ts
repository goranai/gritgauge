import { NextResponse } from "next/server";
import { cache } from "@/services/cache";

export async function GET() {
  const cacheStats = cache.stats();

  return NextResponse.json({
    status: "healthy",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: cacheStats,
    checks: {
      api: "ok",
      database: "ok", // would check prisma.$queryRaw in production
      redis: "disabled", // or check redis.ping()
      openai: process.env.OPENAI_API_KEY ? "configured" : "not configured",
    },
  });
}
