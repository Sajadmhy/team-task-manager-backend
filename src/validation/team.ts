import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Team name is required.")
    .max(100, "Team name must be 100 characters or fewer."),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Team name is required.")
    .max(100, "Team name must be 100 characters or fewer.")
    .optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  teamId: z.string().min(1, "Team ID is required."),
  role: z.enum(["ADMIN", "USER"]).optional().default("USER"),
});

export const updateTeamMemberRoleSchema = z.object({
  memberId: z.string().min(1, "Member ID is required."),
  role: z.enum(["ADMIN", "USER"]),
});
