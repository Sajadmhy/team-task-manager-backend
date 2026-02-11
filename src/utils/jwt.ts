import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

// ── Shared payload ────────────────────────────────────

export interface TokenPayload {
  userId: string;
  email: string;
}

// ── Access token ──────────────────────────────────────

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "dev-secret";
const ACCESS_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY || "15m") as StringValue;

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload &
      TokenPayload;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

// ── Refresh token ─────────────────────────────────────

const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret";
const REFRESH_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY || "7d") as StringValue;

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as jwt.JwtPayload &
      TokenPayload;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}
