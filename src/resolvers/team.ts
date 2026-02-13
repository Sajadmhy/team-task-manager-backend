import type { Context } from "../context";
import * as teamService from "../services/team.service";
import {
  users,
  teams,
  getMembersForTeam,
  getTasksForTeam,
  type StoredTeam,
  type StoredTeamMember,
} from "../store";

// ── Mappers (shape domain objects for GraphQL) ────────────

function toPublicTeam(t: StoredTeam) {
  return { id: t.id, name: t.name, createdAt: t.createdAt };
}

function toPublicMember(m: StoredTeamMember) {
  return {
    id: m.id,
    role: m.role,
    joinedAt: m.joinedAt,
    _userId: m.userId,
    _teamId: m.teamId,
  };
}

// ── Resolvers (thin — delegate to service) ────────────────

export const teamResolvers = {
  Query: {
    teams: (_: unknown, __: unknown, ctx: Context) =>
      teamService.getUserTeams(ctx).map(toPublicTeam),

    team: (_: unknown, { id }: { id: string }, ctx: Context) =>
      toPublicTeam(teamService.getTeam(ctx, id)),

    teamMembers: (_: unknown, { teamId }: { teamId: string }, ctx: Context) =>
      teamService.getMembers(ctx, teamId).map(toPublicMember),
  },

  Mutation: {
    createTeam: (_: unknown, { input }: { input: unknown }, ctx: Context) =>
      toPublicTeam(teamService.createTeam(ctx, input)),

    updateTeam: (_: unknown, { id, input }: { id: string; input: unknown }, ctx: Context) =>
      toPublicTeam(teamService.updateTeam(ctx, id, input)),

    deleteTeam: (_: unknown, { id }: { id: string }, ctx: Context) => {
      teamService.deleteTeam(ctx, id);
      return { success: true, message: "Team deleted successfully." };
    },

    addTeamMember: (_: unknown, { input }: { input: unknown }, ctx: Context) =>
      toPublicMember(teamService.addMember(ctx, input)),

    updateTeamMemberRole: (_: unknown, { input }: { input: unknown }, ctx: Context) =>
      toPublicMember(teamService.updateMemberRole(ctx, input)),

    removeTeamMember: (_: unknown, { memberId }: { memberId: string }, ctx: Context) => {
      teamService.removeMember(ctx, memberId);
      return { success: true, message: "Member removed successfully." };
    },
  },

  // ── Type resolvers (nested field resolution) ────────────

  Team: {
    members: (team: { id: string }) =>
      getMembersForTeam(team.id).map(toPublicMember),

    tasks: (team: { id: string }) =>
      getTasksForTeam(team.id).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        _teamId: t.teamId,
        _assignedUserId: t.assignedUserId,
      })),
  },

  TeamMember: {
    user: (member: { _userId: string }) => {
      const u = users.get(member._userId);
      if (!u) return null;
      return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
    },
    team: (member: { _teamId: string }) => {
      const t = teams.get(member._teamId);
      if (!t) return null;
      return toPublicTeam(t);
    },
  },
};
