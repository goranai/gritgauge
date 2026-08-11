import { NextRequest, NextResponse } from "next/server";
import { getSystemHealth, generateUsageReport, getActiveAlerts, acknowledgeAlert } from "@/services/monitoring/index";
import { triggerJob, getJobStatus } from "@/services/scheduler/index";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "health";

  try {
    switch (section) {
      case "health": {
        const health = await getSystemHealth();
        return NextResponse.json({ success: true, data: health });
      }

      case "usage": {
        const days = parseInt(searchParams.get("days") || "30");
        const report = await generateUsageReport(days);
        return NextResponse.json({ success: true, data: report });
      }

      case "alerts": {
        const alerts = await getActiveAlerts();
        return NextResponse.json({ success: true, data: alerts });
      }

      case "jobs": {
        const jobs = getJobStatus();
        return NextResponse.json({ success: true, data: jobs });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid section" }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, jobName } = body;

    switch (action) {
      case "acknowledgeAlert": {
        if (!alertId) return NextResponse.json({ success: false, error: "Missing alertId" }, { status: 400 });
        const ok = acknowledgeAlert(alertId);
        return NextResponse.json({ success: ok });
      }

      case "triggerJob": {
        if (!jobName) return NextResponse.json({ success: false, error: "Missing jobName" }, { status: 400 });
        const result = await triggerJob(jobName);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
