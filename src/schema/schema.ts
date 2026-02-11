import gql from "graphql-tag";

export const typeDefs = gql`
  # ── Enums ──────────────────────────────────────────────

  enum TeamRole {
    ADMIN
    USER
  }

  enum TaskStatus {
    UNASSIGNED
    ASSIGNED
    IN_PROGRESS
    DONE
  }

  # ── Types ──────────────────────────────────────────────

  type User {
    id: ID!
    email: String!
    name: String
    createdAt: String!
    teams: [TeamMember!]!
  }

  type Team {
    id: ID!
    name: String!
    createdAt: String!
    members: [TeamMember!]!
    tasks: [Task!]!
  }

  type TeamMember {
    id: ID!
    user: User!
    team: Team!
    role: TeamRole!
    joinedAt: String!
  }

  type Task {
    id: ID!
    team: Team!
    assignedUser: User
    title: String!
    description: String
    status: TaskStatus!
    createdAt: String!
    updatedAt: String!
    assignmentHistory: [TaskAssignmentHistory!]!
  }

  type TaskAssignmentHistory {
    id: ID!
    task: Task!
    fromUser: User
    toUser: User
    changedBy: User!
    changedAt: String!
  }

  # ── Auth Types ────────────────────────────────────────

  type AuthPayload {
    accessToken: String!
    user: User!
  }

  # ── Inputs ─────────────────────────────────────────────

  input RegisterInput {
    email: String!
    password: String!
    name: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateUserInput {
    email: String!
    name: String
  }

  input UpdateUserInput {
    email: String
    name: String
  }

  input CreateTeamInput {
    name: String!
  }

  input UpdateTeamInput {
    name: String
  }

  input AddTeamMemberInput {
    userId: ID!
    teamId: ID!
    role: TeamRole
  }

  input UpdateTeamMemberRoleInput {
    memberId: ID!
    role: TeamRole!
  }

  input CreateTaskInput {
    teamId: ID!
    title: String!
    description: String
  }

  input UpdateTaskInput {
    title: String
    description: String
  }

  input AssignTaskInput {
    taskId: ID!
    userId: ID!
  }

  # ── Mutation Responses ─────────────────────────────────

  type MutationResponse {
    success: Boolean!
    message: String!
  }

  # ── Queries ────────────────────────────────────────────

  type Query {
    # Auth
    me: User

    # Users
    users: [User!]!
    user(id: ID!): User

    # Teams
    teams: [Team!]!
    team(id: ID!): Team

    # Team Members
    teamMembers(teamId: ID!): [TeamMember!]!

    # Tasks
    tasks(teamId: ID!): [Task!]!
    task(id: ID!): Task

    # Task Assignment History
    taskAssignmentHistory(taskId: ID!): [TaskAssignmentHistory!]!
  }

  # ── Mutations ──────────────────────────────────────────

  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refresh: AuthPayload!
    logout: MutationResponse!

    # Users
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): MutationResponse!

    # Teams
    createTeam(input: CreateTeamInput!): Team!
    updateTeam(id: ID!, input: UpdateTeamInput!): Team!
    deleteTeam(id: ID!): MutationResponse!

    # Team Members
    addTeamMember(input: AddTeamMemberInput!): TeamMember!
    updateTeamMemberRole(input: UpdateTeamMemberRoleInput!): TeamMember!
    removeTeamMember(memberId: ID!): MutationResponse!

    # Tasks
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): MutationResponse!
    assignTask(input: AssignTaskInput!): Task!
    unassignTask(taskId: ID!): Task!
    updateTaskStatus(taskId: ID!, status: TaskStatus!): Task!
  }
`;
