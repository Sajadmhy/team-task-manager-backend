import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  validate,
  logger,
} from "../utils";
import { registerSchema, loginSchema } from "../validation";
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

  if (findByEmail(email)) {
    logger.auth.warn(`Registration failed — email already exists: ${email}`);
    throw emailAlreadyExists();
  }

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

  logger.auth.info(`User registered: id=${id} email=${email}`);

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
  if (!found) {
    logger.auth.warn(`Login failed — unknown email: ${email}`);
    throw invalidCredentials();
  }

  const valid = await bcrypt.compare(password, found.passwordHash);
  if (!valid) {
    logger.auth.warn(`Login failed — wrong password for: ${email}`);
    throw invalidCredentials();
  }

  logger.auth.info(`User logged in: id=${found.id} email=${email}`);

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
  if (!token) {
    logger.auth.warn("Refresh failed — no token provided");
    throw refreshTokenExpired();
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    logger.auth.warn("Refresh failed — invalid or expired token");
    throw refreshTokenExpired();
  }

  const stored = users.get(payload.userId);
  if (!stored) {
    logger.auth.warn(`Refresh failed — user not found: ${payload.userId}`);
    throw refreshTokenExpired();
  }

  logger.auth.info(`Token refreshed for user: id=${stored.id}`);

  const tokenPayload = { userId: stored.id, email: stored.email };
  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
    user: toPublicUser(stored),
  };
}
