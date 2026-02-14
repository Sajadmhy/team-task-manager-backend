import type { Context } from "../context";
import { taskService } from "../services";
import {
  tasks,
  teams,
  users,
  getHistoryForTask,
  type StoredTask,
  type StoredAssignmentHistory,
} from "../store";

// ── Mappers (shape domain objects for GraphQL) ────────────

function toPublicTask(t: StoredTask) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    _teamId: t.teamId,
    _assignedUserId: t.assignedUserId,
  };
}

function toPublicHistory(h: StoredAssignmentHistory) {
  return {
    id: h.id,
    changedAt: h.changedAt,
    _taskId: h.taskId,
    _fromUserId: h.fromUserId,
    _toUserId: h.toUserId,
    _changedByUserId: h.changedByUserId,
  };
}

function toPublicUser(u: { id: string; email: string; name: string | null; createdAt: string }) {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}

// ── Resolvers (thin — delegate to service) ────────────────

export const taskResolvers = {
  Query: {
    tasks: (_: unknown, { teamId }: { teamId: string }, ctx: Context) =>
      taskService.getTeamTasks(ctx, teamId).map(toPublicTask),

    task: (_: unknown, { id }: { id: string }, ctx: Context) =>
      toPublicTask(taskService.getTask(ctx, id)),

    taskAssignmentHistory: (_: unknown, { taskId }: { taskId: string }, ctx: Context) =>
      taskService.getTaskAssignmentHistory(ctx, taskId).map(toPublicHistory),
  },

  Mutation: {
    createTask: (_: unknown, { input }: { input: unknown }, ctx: Context) =>
      toPublicTask(taskService.createTask(ctx, input)),

    updateTask: (_: unknown, { id, input }: { id: string; input: unknown }, ctx: Context) =>
      toPublicTask(taskService.updateTask(ctx, id, input)),

    deleteTask: (_: unknown, { id }: { id: string }, ctx: Context) => {
      taskService.deleteTask(ctx, id);
      return { success: true, message: "Task deleted successfully." };
    },

    assignTask: (_: unknown, { input }: { input: unknown }, ctx: Context) =>
      toPublicTask(taskService.assignTask(ctx, input)),

    unassignTask: (_: unknown, { taskId }: { taskId: string }, ctx: Context) =>
      toPublicTask(taskService.unassignTask(ctx, taskId)),

    updateTaskStatus: (_: unknown, { taskId, status }: { taskId: string; status: string }, ctx: Context) =>
      toPublicTask(taskService.updateTaskStatus(ctx, taskId, status)),
  },

  // ── Type resolvers (nested field resolution) ────────────

  Task: {
    team: (task: { _teamId: string }) => {
      const t = teams.get(task._teamId);
      if (!t) return null;
      return { id: t.id, name: t.name, createdAt: t.createdAt };
    },

    assignedUser: (task: { _assignedUserId: string | null }) => {
      if (!task._assignedUserId) return null;
      const u = users.get(task._assignedUserId);
      if (!u) return null;
      return toPublicUser(u);
    },

    assignmentHistory: (task: { id: string }) =>
      getHistoryForTask(task.id).map(toPublicHistory),
  },

  TaskAssignmentHistory: {
    task: (h: { _taskId: string }) => {
      const t = tasks.get(h._taskId);
      if (!t) return null;
      return toPublicTask(t);
    },

    fromUser: (h: { _fromUserId: string | null }) => {
      if (!h._fromUserId) return null;
      const u = users.get(h._fromUserId);
      return u ? toPublicUser(u) : null;
    },

    toUser: (h: { _toUserId: string | null }) => {
      if (!h._toUserId) return null;
      const u = users.get(h._toUserId);
      return u ? toPublicUser(u) : null;
    },

    changedBy: (h: { _changedByUserId: string }) => {
      const u = users.get(h._changedByUserId);
      return u ? toPublicUser(u) : null;
    },
  },
};
