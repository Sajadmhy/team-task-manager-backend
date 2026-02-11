import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "dev-secret";
const ACCESS_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY || "15m") as StringValue;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function verifyAccessToken(
  token: string
): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload &
      AccessTokenPayload;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}
