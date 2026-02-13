import { authResolvers } from "./auth";
import { teamResolvers } from "./team";
import { taskResolvers } from "./task";
import { getTeamsForUser } from "../store";

export const resolvers = {
  Query: {
    // Auth
    ...authResolvers.Query,

    // Users
    users: () => "OK",
    user: () => "OK",

    // Teams
    ...teamResolvers.Query,

    // Tasks + History
    ...taskResolvers.Query,
  },

  Mutation: {
    // Auth
    ...authResolvers.Mutation,

    // Users
    createUser: () => "OK",
    updateUser: () => "OK",
    deleteUser: () => "OK",

    // Teams
    ...teamResolvers.Mutation,

    // Tasks
    ...taskResolvers.Mutation,
  },

  // ── Type resolvers ──────────────────────────────────────

  Team: {
    ...teamResolvers.Team,
  },

  TeamMember: {
    ...teamResolvers.TeamMember,
  },

  Task: {
    ...taskResolvers.Task,
  },

  TaskAssignmentHistory: {
    ...taskResolvers.TaskAssignmentHistory,
  },

  User: {
    teams: (user: { id: string }) => {
      const memberships = getTeamsForUser(user.id);
      return memberships.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        _userId: m.userId,
        _teamId: m.teamId,
      }));
    },
  },
};
