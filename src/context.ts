import type { Request } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "./utils/jwt";

export interface Context {
  /** The authenticated user, or null if unauthenticated */
  user: AccessTokenPayload | null;
}

export function buildContext(req: Request): Context {
  const header = req.headers.authorization; // "Bearer <token>"

  if (!header || !header.startsWith("Bearer ")) {
    return { user: null };
  }

  const token = header.slice(7); // strip "Bearer "
  const payload = verifyAccessToken(token);

  return { user: payload };
}
