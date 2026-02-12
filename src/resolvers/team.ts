import type { Context } from "../context";
import {
  teams,
  teamMembers,
  users,
  nextId,
  findMemberByUserAndTeam,
  getMembersForTeam,
  getTeamsForUser,
  type StoredTeam,
  type StoredTeamMember,
} from "../store";
import { requireAuth, requireRole, requireTeamMember } from "../utils/auth";
import { notFound, validationError, unauthorized } from "../errors";
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberRoleSchema,
} from "../validation/team";

// ── Public mappers ───────────────────────────────────────

function toPublicTeam(t: StoredTeam) {
  return {
    id: t.id,
    name: t.name,
    createdAt: t.createdAt,
    // Nested fields resolved by type resolvers below
  };
}

function toPublicMember(m: StoredTeamMember) {
  return {
    id: m.id,
    role: m.role,
    joinedAt: m.joinedAt,
    // user / team resolved by type resolvers below
    _userId: m.userId,
    _teamId: m.teamId,
  };
}

// ── Resolvers ────────────────────────────────────────────

export const teamResolvers = {
  // ── Queries ──────────────────────────────────────────

  Query: {
    /** List all teams the authenticated user belongs to */
    teams: (_: unknown, __: unknown, ctx: Context) => {
      const user = requireAuth(ctx);
      const memberships = getTeamsForUser(user.userId);
      return memberships
        .map((m) => teams.get(m.teamId))
        .filter(Boolean)
        .map((t) => toPublicTeam(t!));
    },

    /** Get a single team (must be a member) */
    team: (_: unknown, { id }: { id: string }, ctx: Context) => {
      requireTeamMember(ctx, id);
      const t = teams.get(id);
      if (!t) throw notFound("Team");
      return toPublicTeam(t);
    },

    /** List members of a team (must be a member) */
    teamMembers: (
      _: unknown,
      { teamId }: { teamId: string },
      ctx: Context
    ) => {
      requireTeamMember(ctx, teamId);
      return getMembersForTeam(teamId).map(toPublicMember);
    },
  },

  // ── Mutations ────────────────────────────────────────

  Mutation: {
    /** Create a new team — creator automatically becomes ADMIN */
    createTeam: (
      _: unknown,
      { input }: { input: { name: string } },
      ctx: Context
    ) => {
      const user = requireAuth(ctx);

      const parsed = createTeamSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          parsed.error.issues.map((i) => i.message).join(" ")
        );
      }

      const now = new Date().toISOString();

      const teamId = nextId();
      const team: StoredTeam = {
        id: teamId,
        name: parsed.data.name,
        createdAt: now,
      };
      teams.set(teamId, team);

      // Add creator as ADMIN (no transaction needed — in-memory is synchronous)
      const memberId = nextId();
      const membership: StoredTeamMember = {
        id: memberId,
        userId: user.userId,
        teamId,
        role: "ADMIN",
        joinedAt: now,
      };
      teamMembers.set(memberId, membership);

      return toPublicTeam(team);
    },

    updateTeam: (
      _: unknown,
      { id, input }: { id: string; input: { name?: string } },
      ctx: Context
    ) => {
      requireRole(ctx, id, "ADMIN");

      const team = teams.get(id);
      if (!team) throw notFound("Team");

      const parsed = updateTeamSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          parsed.error.issues.map((i) => i.message).join(" ")
        );
      }

      if (parsed.data.name !== undefined) {
        team.name = parsed.data.name;
      }

      return toPublicTeam(team);
    },

    /** Delete a team — ADMIN only. Removes team + all memberships. */
    deleteTeam: (_: unknown, { id }: { id: string }, ctx: Context) => {
      requireRole(ctx, id, "ADMIN");

      const team = teams.get(id);
      if (!team) throw notFound("Team");

      for (const [memberId, m] of teamMembers) {
        if (m.teamId === id) teamMembers.delete(memberId);
      }

      teams.delete(id);

      return { success: true, message: "Team deleted successfully." };
    },

    addTeamMember: (
      _: unknown,
      {
        input,
      }: { input: { userId: string; teamId: string; role?: string } },
      ctx: Context
    ) => {
      const parsed = addTeamMemberSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          parsed.error.issues.map((i) => i.message).join(" ")
        );
      }
      const { userId, teamId, role } = parsed.data;

      requireRole(ctx, teamId, "ADMIN");

      if (!teams.has(teamId)) throw notFound("Team");

      if (!users.has(userId)) throw notFound("User");

      if (findMemberByUserAndTeam(userId, teamId)) {
        throw validationError("User is already a member of this team.");
      }

      const memberId = nextId();
      const now = new Date().toISOString();
      const membership: StoredTeamMember = {
        id: memberId,
        userId,
        teamId,
        role,
        joinedAt: now,
      };
      teamMembers.set(memberId, membership);

      return toPublicMember(membership);
    },

    updateTeamMemberRole: (
      _: unknown,
      { input }: { input: { memberId: string; role: string } },
      ctx: Context
    ) => {
      const parsed = updateTeamMemberRoleSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          parsed.error.issues.map((i) => i.message).join(" ")
        );
      }
      const { memberId, role } = parsed.data;

      const member = teamMembers.get(memberId);
      if (!member) throw notFound("Team member");

      const actor = requireRole(ctx, member.teamId, "ADMIN");

      if (actor.id === memberId && role !== "ADMIN") {
        const admins = getMembersForTeam(member.teamId).filter(
          (m) => m.role === "ADMIN"
        );
        if (admins.length <= 1) {
          throw unauthorized(
            "Cannot demote yourself — you are the only admin."
          );
        }
      }

      member.role = role;
      return toPublicMember(member);
    },

    removeTeamMember: (
      _: unknown,
      { memberId }: { memberId: string },
      ctx: Context
    ) => {
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

      return { success: true, message: "Member removed successfully." };
    },
  },

  // ── Type resolvers (nested fields) ──────────────────

  Team: {
    members: (team: { id: string }) => {
      return getMembersForTeam(team.id).map(toPublicMember);
    },
    tasks: () => {
      // Placeholder — will be wired when task resolvers are implemented
      return [];
    },
  },

  TeamMember: {
    user: (member: { _userId: string }) => {
      const u = users.get(member._userId);
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
      };
    },
    team: (member: { _teamId: string }) => {
      const t = teams.get(member._teamId);
      if (!t) return null;
      return toPublicTeam(t);
    },
  },
};
