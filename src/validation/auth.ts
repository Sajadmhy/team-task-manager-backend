import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .email({ message: "Invalid email address." })
    .trim()
    .max(255, "Email must be at most 255 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one digit."),
  name: z
    .string()
    .trim()
    .min(1, "Name must not be empty.")
    .max(100, "Name must be at most 100 characters.")
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .email({ message: "Invalid email address." })
    .trim(),
  password: z
    .string()
    .min(1, "Password is required."),
});
