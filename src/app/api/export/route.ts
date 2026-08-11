import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reportSchema } from "@/lib/validation";
import prisma from "@/lib/prisma";
import { computeHealthMetrics } from "@/services/analytics";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { repoId, type, format, title } = parsed.data;

    let reportData: Record<string, unknown> = {};

    if (repoId && type === "health") {
      const metrics = await computeHealthMetrics(repoId, "", "");
      reportData = { ...metrics, generatedAt: new Date().toISOString() };
    }

    // For CSV exports
    if (format === "csv") {
      const csvContent = generateCSV(reportData, type);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "_")}.csv"`,
        },
      });
    }

    // For JSON exports
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: reportData,
        meta: { title, type, generatedAt: new Date().toISOString() },
      });
    }

    // Try to save report (non-critical)
    try {
      await prisma.report.create({
        data: {
          userId: session.user.id,
          repoId: repoId || null,
          title,
          type,
          format,
          data: reportData,
        },
      });
    } catch { /* repo may not be saved */ }

    // For Markdown
    if (format === "markdown") {
      const md = generateMarkdown(reportData, type, title);
      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "_")}.md"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function generateCSV(data: Record<string, unknown>, type: string): string {
  if (type === "health") {
    const headers = ["Metric", "Value"];
    const rows = Object.entries(data)
      .filter(([, v]) => typeof v !== "object")
      .map(([k, v]) => `${k},${v}`);
    return [headers.join(","), ...rows].join("\n");
  }
  return "No data available";
}

function generateMarkdown(
  data: Record<string, unknown>,
  type: string,
  title: string
): string {
  let md = `# ${title}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n`;
  md += `Type: ${type}\n\n`;

  if (type === "health") {
    md += "## Health Metrics\n\n";
    md += "| Metric | Value |\n|--------|-------|\n";
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== "object") {
        md += `| ${key} | ${value} |\n`;
      }
    }
  }

  return md;
}

