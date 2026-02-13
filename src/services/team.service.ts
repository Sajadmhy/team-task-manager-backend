import type { Context } from "../context";
import { validate } from "../utils/validate";
import { requireAuth, requireRole, requireTeamMember } from "../utils/auth";
import { notFound, unauthorized, validationError } from "../errors";
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberRoleSchema,
} from "../validation/team";
import {
  teams,
  teamMembers,
  tasks,
  assignmentHistory,
  users,
  nextId,
  findMemberByUserAndTeam,
  getMembersForTeam,
  getTeamsForUser,
  type StoredTeam,
  type StoredTeamMember,
} from "../store";

// ── Queries ──────────────────────────────────────────────

export function getUserTeams(ctx: Context): StoredTeam[] {
  const user = requireAuth(ctx);
  return getTeamsForUser(user.userId)
    .map((m) => teams.get(m.teamId))
    .filter((t): t is StoredTeam => t !== undefined);
}

export function getTeam(ctx: Context, id: string): StoredTeam {
  requireTeamMember(ctx, id);
  const team = teams.get(id);
  if (!team) throw notFound("Team");
  return team;
}

export function getMembers(
  ctx: Context,
  teamId: string
): StoredTeamMember[] {
  requireTeamMember(ctx, teamId);
  return getMembersForTeam(teamId);
}

// ── Mutations ────────────────────────────────────────────

export function createTeam(ctx: Context, input: unknown): StoredTeam {
  const user = requireAuth(ctx);
  const { name } = validate(createTeamSchema, input);

  const now = new Date().toISOString();

  // Create team
  const teamId = nextId();
  const team: StoredTeam = { id: teamId, name, createdAt: now };
  teams.set(teamId, team);

  // Creator becomes ADMIN
  const memberId = nextId();
  const membership: StoredTeamMember = {
    id: memberId,
    userId: user.userId,
    teamId,
    role: "ADMIN",
    joinedAt: now,
  };
  teamMembers.set(memberId, membership);

  return team;
}

export function updateTeam(
  ctx: Context,
  id: string,
  input: unknown
): StoredTeam {
  requireRole(ctx, id, "ADMIN");

  const team = teams.get(id);
  if (!team) throw notFound("Team");

  const data = validate(updateTeamSchema, input);
  if (data.name !== undefined) team.name = data.name;

  return team;
}

export function deleteTeam(ctx: Context, id: string): void {
  requireRole(ctx, id, "ADMIN");

  const team = teams.get(id);
  if (!team) throw notFound("Team");

  // Collect task IDs → clean up history
  const teamTaskIds = new Set<string>();
  for (const [taskId, t] of tasks) {
    if (t.teamId === id) teamTaskIds.add(taskId);
  }
  for (const [hId, h] of assignmentHistory) {
    if (teamTaskIds.has(h.taskId)) assignmentHistory.delete(hId);
  }
  for (const taskId of teamTaskIds) {
    tasks.delete(taskId);
  }

  // Remove memberships
  for (const [memberId, m] of teamMembers) {
    if (m.teamId === id) teamMembers.delete(memberId);
  }

  teams.delete(id);
}

export function addMember(
  ctx: Context,
  input: unknown
): StoredTeamMember {
  const { userId, teamId, role } = validate(addTeamMemberSchema, input);

  requireRole(ctx, teamId, "ADMIN");

  if (!teams.has(teamId)) throw notFound("Team");
  if (!users.has(userId)) throw notFound("User");

  if (findMemberByUserAndTeam(userId, teamId)) {
    throw validationError("User is already a member of this team.");
  }

  const memberId = nextId();
  const membership: StoredTeamMember = {
    id: memberId,
    userId,
    teamId,
    role,
    joinedAt: new Date().toISOString(),
  };
  teamMembers.set(memberId, membership);

  return membership;
}

export function updateMemberRole(
  ctx: Context,
  input: unknown
): StoredTeamMember {
  const { memberId, role } = validate(updateTeamMemberRoleSchema, input);

  const member = teamMembers.get(memberId);
  if (!member) throw notFound("Team member");

  const actor = requireRole(ctx, member.teamId, "ADMIN");

  // Prevent last-admin demotion
  if (actor.id === memberId && role !== "ADMIN") {
    const admins = getMembersForTeam(member.teamId).filter(
      (m) => m.role === "ADMIN"
    );
    if (admins.length <= 1) {
      throw unauthorized("Cannot demote yourself — you are the only admin.");
    }
  }

  member.role = role;
  return member;
}

export function removeMember(ctx: Context, memberId: string): void {
  const member = teamMembers.get(memberId);
  if (!member) throw notFound("Team member");

  const actor = requireRole(ctx, member.teamId, "ADMIN");

  if (actor.id === memberId) {
    const admins = getMembersForTeam(member.teamId).filter(
      (m) => m.role === "ADMIN"
    );
    if (admins.length <= 1) {
      throw unauthorized(
        "Cannot remove yourself — you are the only admin."
      );
    }
  }

  teamMembers.delete(memberId);
}
