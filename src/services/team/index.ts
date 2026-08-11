/**
 * Team & Collaboration System
 * Multi-user team management, role-based access, shared dashboards
 */
import prisma from "@/lib/prisma";
import crypto from "crypto";

export type TeamRole = "owner" | "admin" | "maintainer" | "viewer";

export interface TeamMember {
  userId: string;
  name: string | null;
  email: string | null;
  githubLogin: string | null;
  role: TeamRole;
  joinedAt: Date;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  accepted: boolean;
}

// ─── Team Management ───

export async function createTeam(
  ownerId: string,
  name: string,
  description?: string
): Promise<{ id: string; name: string; inviteCode: string }> {
  // Store team in savedRepo metadata — extend as needed
  const inviteCode = crypto.randomBytes(8).toString("hex");

  await prisma.auditLog.create({
    data: {
      userId: ownerId,
      action: "team.created",
      resource: "team",
      resourceId: inviteCode,
      metadata: { name, description },
    },
  });

  return { id: inviteCode, name, inviteCode };
}

export async function inviteMember(
  teamId: string,
  inviterId: string,
  email: string,
  role: TeamRole = "viewer"
): Promise<TeamInvite> {
  const id = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000); // 7 days

  await prisma.auditLog.create({
    data: {
      userId: inviterId,
      action: "team.invited",
      resource: "team_invite",
      resourceId: id,
      metadata: { teamId, email, role },
    },
  });

  return {
    id,
    email,
    role,
    invitedBy: inviterId,
    createdAt: new Date(),
    expiresAt,
    accepted: false,
  };
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  // In a full implementation, would query a TeamMember table
  // For now, return from audit logs
  const logs = await prisma.auditLog.findMany({
    where: { resourceId: teamId, resource: "team_invite" },
    take: 50,
  });

  return logs.map((log) => ({
    userId: log.userId || "unknown",
    name: null,
    email: (log.metadata as Record<string, string>)?.email || null,
    githubLogin: null,
    role: ((log.metadata as Record<string, string>)?.role as TeamRole) || "viewer",
    joinedAt: log.createdAt,
  }));
}

export async function removeMember(teamId: string, userId: string, removedBy: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: removedBy,
      action: "team.removed",
      resource: "team_member",
      resourceId: teamId,
      metadata: { removedUser: userId },
    },
  });
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole,
  updatedBy: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: updatedBy,
      action: "team.role_updated",
      resource: "team_member",
      resourceId: teamId,
      metadata: { targetUser: userId, newRole },
    },
  });
}

// ─── Shared Dashboard Access ───

export async function getSharedRepos(userId: string): Promise<string[]> {
  // Get repos shared with this user via teams
  const logs = await prisma.auditLog.findMany({
    where: {
      action: "team.invited",
      metadata: { path: ["email"], equals: userId },
    },
    take: 50,
  });

  const teamIds = logs.map((log) => log.resourceId);
  const repos = await prisma.savedRepo.findMany({
    where: {
      userId: { in: teamIds },
    },
  });

  return repos.map((r) => r.id);
}

// ─── Activity Feed ───

export interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  action: string;
  target: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export async function getTeamActivityFeed(
  teamId: string,
  limit: number = 50
): Promise<ActivityEvent[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      resourceId: teamId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    type: log.action,
    actor: log.userId || "system",
    action: log.action,
    target: log.resource,
    timestamp: log.createdAt,
    metadata: (log.metadata as Record<string, unknown>) || {},
  }));
}

// ─── Permission Checks ───

const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  maintainer: 2,
  viewer: 1,
};

export function canPerformAction(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export const PERMISSIONS = {
  VIEW_DASHBOARD: "viewer" as TeamRole,
  TRIAGE_ISSUES: "maintainer" as TeamRole,
  REVIEW_PRS: "maintainer" as TeamRole,
  MANAGE_SETTINGS: "admin" as TeamRole,
  MANAGE_TEAM: "admin" as TeamRole,
  MANAGE_BILLING: "owner" as TeamRole,
  DELETE_REPO: "owner" as TeamRole,
  RUN_SECURITY_SCANS: "maintainer" as TeamRole,
  EXPORT_REPORTS: "maintainer" as TeamRole,
  MANAGE_WEBHOOKS: "admin" as TeamRole,
};
