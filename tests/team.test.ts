import {
  canPerformAction, PERMISSIONS, createTeam, inviteMember, getTeamMembers,
  removeMember, updateMemberRole, getTeamActivityFeed, getSharedRepos,
  type TeamRole, type TeamMember, type ActivityEvent,
} from "../src/services/team/index";

describe("Team System", () => {
  const teamId = "test-team-123";
  const ownerId = "user-owner";
  const memberId = "user-member";

  describe("createTeam", () => {
    it("creates a team with invite code", async () => {
      const result = await createTeam(ownerId, "Test Team", "A test team");
      expect(result.name).toBe("Test Team");
      expect(result.inviteCode).toBeDefined();
      expect(result.inviteCode.length).toBe(16);
    });
  });

  describe("inviteMember", () => {
    it("creates an invitation", async () => {
      const invite = await inviteMember(teamId, ownerId, "test@example.com", "maintainer");
      expect(invite.email).toBe("test@example.com");
      expect(invite.role).toBe("maintainer");
      expect(invite.accepted).toBe(false);
      expect(invite.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe("getTeamMembers", () => {
    it("returns team members from logs", async () => {
      const members = await getTeamMembers(teamId);
      expect(Array.isArray(members)).toBe(true);
    });
  });

  describe("removeMember", () => {
    it("logs member removal", async () => {
      await expect(removeMember(teamId, memberId, ownerId)).resolves.not.toThrow();
    });
  });

  describe("updateMemberRole", () => {
    it("logs role update", async () => {
      await expect(updateMemberRole(teamId, memberId, "admin", ownerId)).resolves.not.toThrow();
    });
  });

  describe("getTeamActivityFeed", () => {
    it("returns activity events", async () => {
      const feed = await getTeamActivityFeed(teamId, 10);
      expect(Array.isArray(feed)).toBe(true);
    });
  });

  describe("canPerformAction", () => {
    it("owner can do everything", () => {
      expect(canPerformAction("owner", "viewer")).toBe(true);
      expect(canPerformAction("owner", "maintainer")).toBe(true);
      expect(canPerformAction("owner", "admin")).toBe(true);
      expect(canPerformAction("owner", "owner")).toBe(true);
    });

    it("viewer can only view", () => {
      expect(canPerformAction("viewer", "viewer")).toBe(true);
      expect(canPerformAction("viewer", "maintainer")).toBe(false);
      expect(canPerformAction("viewer", "admin")).toBe(false);
    });

    it("maintainer can triage and review", () => {
      expect(canPerformAction("maintainer", "viewer")).toBe(true);
      expect(canPerformAction("maintainer", "maintainer")).toBe(true);
      expect(canPerformAction("maintainer", "admin")).toBe(false);
    });

    it("admin can manage team and settings", () => {
      expect(canPerformAction("admin", "maintainer")).toBe(true);
      expect(canPerformAction("admin", "admin")).toBe(true);
      expect(canPerformAction("admin", "owner")).toBe(false);
    });
  });

  describe("PERMISSIONS", () => {
    it("has all required permissions defined", () => {
      expect(PERMISSIONS.VIEW_DASHBOARD).toBeDefined();
      expect(PERMISSIONS.TRIAGE_ISSUES).toBeDefined();
      expect(PERMISSIONS.REVIEW_PRS).toBeDefined();
      expect(PERMISSIONS.MANAGE_SETTINGS).toBeDefined();
      expect(PERMISSIONS.MANAGE_TEAM).toBeDefined();
      expect(PERMISSIONS.MANAGE_BILLING).toBeDefined();
      expect(PERMISSIONS.DELETE_REPO).toBeDefined();
      expect(PERMISSIONS.RUN_SECURITY_SCANS).toBeDefined();
      expect(PERMISSIONS.EXPORT_REPORTS).toBeDefined();
      expect(PERMISSIONS.MANAGE_WEBHOOKS).toBeDefined();
    });
  });
});
