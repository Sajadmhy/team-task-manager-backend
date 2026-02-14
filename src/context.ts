import type { Request, Response } from "express";
import { verifyAccessToken, type TokenPayload, logger } from "./utils";

export interface Context {
  /** The authenticated user, or null if unauthenticated */
  user: TokenPayload | null;
  /** Express request (needed to read cookies) */
  req: Request;
  /** Express response (needed to set/clear cookies) */
  res: Response;
}

/**
 * Build a GraphQL context from the incoming Express request.
 * Extracts the Bearer token from the Authorization header
 * and verifies it. If valid, `context.user` is populated.
 */
export function buildContext(req: Request, res: Response): Context {
  const header = req.headers.authorization; // "Bearer <token>"

  let user: TokenPayload | null = null;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice(7);
    user = verifyAccessToken(token);
    if (!user) {
      logger.auth.warn("Invalid or expired access token presented");
    }
  }

  return { user, req, res };
}
