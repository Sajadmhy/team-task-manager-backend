import { authResolvers } from "./auth";
import { teamResolvers } from "./team";
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

    // Tasks
    tasks: () => "OK",
    task: () => "OK",

    // History
    taskAssignmentHistory: () => "OK",
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
    createTask: () => "OK",
    updateTask: () => "OK",
    deleteTask: () => "OK",
    assignTask: () => "OK",
    unassignTask: () => "OK",
    updateTaskStatus: () => "OK",
  },

  // ── Type resolvers ──────────────────────────────────────

  Team: {
    ...teamResolvers.Team,
  },

  TeamMember: {
    ...teamResolvers.TeamMember,
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
