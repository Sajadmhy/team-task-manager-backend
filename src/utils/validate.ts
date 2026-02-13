import type { ZodSchema } from "zod";
import { validationError } from "../errors";

/**
 * Parse `data` through a Zod schema.
 * Returns typed, validated data — or throws a consistent VALIDATION_ERROR.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw validationError(
      result.error.issues.map((i) => i.message).join(" ")
    );
  }
  return result.data;
}
