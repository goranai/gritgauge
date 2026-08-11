import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const repos = await prisma.savedRepo.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      healthSnaps: { orderBy: { snapshotDate: "desc" }, take: 1 },
      triageLogs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return NextResponse.json({ success: true, data: repos });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { owner, name, fullName, description, isMonitored } = body;

    if (!owner || !name) {
      return NextResponse.json({ success: false, error: "Owner and name are required" }, { status: 400 });
    }

    const existing = await prisma.savedRepo.findUnique({
      where: { userId_fullName: { userId: session.user.id, fullName: fullName || `${owner}/${name}` } },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Repo already saved" }, { status: 409 });
    }

    const repo = await prisma.savedRepo.create({
      data: {
        userId: session.user.id,
        owner,
        name,
        fullName: fullName || `${owner}/${name}`,
        description: description || null,
        isMonitored: isMonitored ?? true,
      },
    });

    return NextResponse.json({ success: true, data: repo }, { status: 201 });
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
  const repoId = searchParams.get("id");

  if (!repoId) {
    return NextResponse.json({ success: false, error: "Missing repo ID" }, { status: 400 });
  }

  await prisma.savedRepo.deleteMany({
    where: { id: repoId, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
