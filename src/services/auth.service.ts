import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { validate } from "../utils/validate";
import { registerSchema, loginSchema } from "../validation/auth";
import {
  emailAlreadyExists,
  invalidCredentials,
  refreshTokenExpired,
} from "../errors";
import { users, nextId, type StoredUser } from "../store";

// ── Public shapes returned by this service ────────────────

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

// ── Mappers ───────────────────────────────────────────────

function toPublicUser(u: StoredUser): PublicUser {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}

function findByEmail(email: string): StoredUser | undefined {
  for (const u of users.values()) {
    if (u.email === email) return u;
  }
  return undefined;
}

// ── Service methods ───────────────────────────────────────

export function getMe(userId: string): PublicUser | null {
  const stored = users.get(userId);
  return stored ? toPublicUser(stored) : null;
}

export async function register(input: unknown): Promise<AuthResult> {
  const { email, password, name } = validate(registerSchema, input);

  if (findByEmail(email)) throw emailAlreadyExists();

  const passwordHash = await bcrypt.hash(password, 10);
  const id = nextId();
  const now = new Date().toISOString();

  const user: StoredUser = {
    id,
    email,
    passwordHash,
    name: name ?? null,
    createdAt: now,
  };
  users.set(id, user);

  const tokenPayload = { userId: id, email };
  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
    user: toPublicUser(user),
  };
}

export async function login(input: unknown): Promise<AuthResult> {
  const { email, password } = validate(loginSchema, input);

  const found = findByEmail(email);
  if (!found) throw invalidCredentials();

  const valid = await bcrypt.compare(password, found.passwordHash);
  if (!valid) throw invalidCredentials();

  const tokenPayload = { userId: found.id, email: found.email };
  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
    user: toPublicUser(found),
  };
}

/**
 * Validate a refresh token string and return a new token pair.
 * The resolver is responsible for reading/writing the cookie.
 */
export function refresh(token: string | undefined): AuthResult {
  if (!token) throw refreshTokenExpired();

  const payload = verifyRefreshToken(token);
  if (!payload) throw refreshTokenExpired();

  const stored = users.get(payload.userId);
  if (!stored) throw refreshTokenExpired();

  const tokenPayload = { userId: stored.id, email: stored.email };
  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
    user: toPublicUser(stored),
  };
}
