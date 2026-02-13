import { z } from "zod";

export const createTaskSchema = z.object({
  teamId: z.string().min(1, "Team ID is required."),
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(200, "Task title must be 200 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer.")
    .optional()
    .nullable(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(200, "Task title must be 200 characters or fewer.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer.")
    .optional()
    .nullable(),
});

export const assignTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required."),
  userId: z.string().min(1, "User ID is required."),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "DONE"]),
});
