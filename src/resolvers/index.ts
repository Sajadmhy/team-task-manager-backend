import { authResolvers } from "./auth";

export const resolvers = {
  Query: {
    // Auth
    ...authResolvers.Query,

    // Users
    users: () => "OK",
    user: () => "OK",

    // Teams
    teams: () => "OK",
    team: () => "OK",

    // Team Members
    teamMembers: () => "OK",

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
    createTeam: () => "OK",
    updateTeam: () => "OK",
    deleteTeam: () => "OK",

    // Team Members
    addTeamMember: () => "OK",
    updateTeamMemberRole: () => "OK",
    removeTeamMember: () => "OK",

    // Tasks
    createTask: () => "OK",
    updateTask: () => "OK",
    deleteTask: () => "OK",
    assignTask: () => "OK",
    unassignTask: () => "OK",
    updateTaskStatus: () => "OK",
  },
};
