import type { Context } from "../context";
import { validate } from "../utils/validate";
import { requireAuth, requireRole, requireTeamMember } from "../utils/auth";
import { notFound, unauthorized, validationError } from "../errors";
import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  updateTaskStatusSchema,
} from "../validation/task";
import {
  tasks,
  teams,
  users,
  assignmentHistory,
  nextId,
  getTasksForTeam,
  getHistoryForTask,
  findMemberByUserAndTeam,
  type StoredTask,
  type StoredAssignmentHistory,
} from "../store";

// ── Internal helpers ─────────────────────────────────────

function requireTaskOwnerOrAdmin(ctx: Context, task: StoredTask) {
  const member = requireTeamMember(ctx, task.teamId);
  if (member.role === "ADMIN") return member;

  if (task.assignedUserId !== member.userId) {
    throw unauthorized("You can only modify tasks assigned to you.");
  }
  return member;
}

// ── Queries ──────────────────────────────────────────────

export function getTeamTasks(ctx: Context, teamId: string): StoredTask[] {
  requireTeamMember(ctx, teamId);
  if (!teams.has(teamId)) throw notFound("Team");
  return getTasksForTeam(teamId);
}

export function getTask(ctx: Context, id: string): StoredTask {
  const task = tasks.get(id);
  if (!task) throw notFound("Task");
  requireTeamMember(ctx, task.teamId);
  return task;
}

export function getTaskAssignmentHistory(
  ctx: Context,
  taskId: string,
): StoredAssignmentHistory[] {
  const task = tasks.get(taskId);
  if (!task) throw notFound("Task");
  requireTeamMember(ctx, task.teamId);
  return getHistoryForTask(taskId);
}

// ── Mutations ────────────────────────────────────────────

export function createTask(ctx: Context, input: unknown): StoredTask {
  const { teamId, title, description } = validate(createTaskSchema, input);

  requireTeamMember(ctx, teamId);
  if (!teams.has(teamId)) throw notFound("Team");

  const now = new Date().toISOString();
  const id = nextId();

  const task: StoredTask = {
    id,
    teamId,
    assignedUserId: null,
    title,
    description: description ?? null,
    status: "UNASSIGNED",
    createdAt: now,
    updatedAt: now,
  };
  tasks.set(id, task);

  return task;
}

export function updateTask(
  ctx: Context,
  id: string,
  input: unknown,
): StoredTask {
  const task = tasks.get(id);
  if (!task) throw notFound("Task");

  requireTaskOwnerOrAdmin(ctx, task);

  const data = validate(updateTaskSchema, input);
  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  task.updatedAt = new Date().toISOString();

  return task;
}

export function deleteTask(ctx: Context, id: string): void {
  const task = tasks.get(id);
  if (!task) throw notFound("Task");

  requireRole(ctx, task.teamId, "ADMIN");

  for (const [hId, h] of assignmentHistory) {
    if (h.taskId === id) assignmentHistory.delete(hId);
  }
  tasks.delete(id);
}

export function assignTask(ctx: Context, input: unknown): StoredTask {
  const { taskId, userId } = validate(assignTaskSchema, input);

  const task = tasks.get(taskId);
  if (!task) throw notFound("Task");

  requireRole(ctx, task.teamId, "ADMIN");

  if (!users.has(userId)) throw notFound("User");
  if (!findMemberByUserAndTeam(userId, task.teamId)) {
    throw validationError("User is not a member of this team.");
  }

  const caller = requireAuth(ctx);
  const now = new Date().toISOString();

  // Record history
  const historyId = nextId();
  const record: StoredAssignmentHistory = {
    id: historyId,
    taskId,
    fromUserId: task.assignedUserId,
    toUserId: userId,
    changedByUserId: caller.userId,
    changedAt: now,
  };
  assignmentHistory.set(historyId, record);

  task.assignedUserId = userId;
  task.status = "ASSIGNED";
  task.updatedAt = now;

  return task;
}

export function unassignTask(ctx: Context, taskId: string): StoredTask {
  const task = tasks.get(taskId);
  if (!task) throw notFound("Task");

  requireRole(ctx, task.teamId, "ADMIN");

  const caller = requireAuth(ctx);
  const now = new Date().toISOString();

  const historyId = nextId();
  const record: StoredAssignmentHistory = {
    id: historyId,
    taskId,
    fromUserId: task.assignedUserId,
    toUserId: null,
    changedByUserId: caller.userId,
    changedAt: now,
  };
  assignmentHistory.set(historyId, record);

  task.assignedUserId = null;
  task.status = "UNASSIGNED";
  task.updatedAt = now;

  return task;
}

export function updateTaskStatus(
  ctx: Context,
  taskId: string,
  status: unknown,
): StoredTask {
  const task = tasks.get(taskId);
  if (!task) throw notFound("Task");

  requireTaskOwnerOrAdmin(ctx, task);

  const parsed = validate(updateTaskStatusSchema, { status });
  task.status = parsed.status;
  task.updatedAt = new Date().toISOString();

  return task;
}
