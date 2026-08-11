import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { webhookSchema } from "@/lib/validation";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const webhooks = await prisma.webhook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Don't expose secrets
  const safe = webhooks.map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events,
    isActive: w.isActive,
    lastSentAt: w.lastSentAt,
    failCount: w.failCount,
    createdAt: w.createdAt,
  }));

  return NextResponse.json({ success: true, data: safe });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const webhook = await prisma.webhook.create({
      data: {
        userId: session.user.id,
        url: parsed.data.url,
        events: parsed.data.events,
        secret: parsed.data.secret || crypto.randomBytes(32).toString("hex"),
      },
    });

    return NextResponse.json({ success: true, data: webhook }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing webhook ID" }, { status: 400 });
  }

  await prisma.webhook.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
