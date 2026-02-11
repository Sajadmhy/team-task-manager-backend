import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { registerSchema, loginSchema } from "../validation/auth";
import {
  validationError,
  emailAlreadyExists,
  invalidCredentials,
  refreshTokenExpired,
} from "../errors";
import type { Context } from "../context";

// ── In-memory user store (replace with DB later) ──────

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: string;
}

const users: Map<string, StoredUser> = new Map();
let nextId = 1;

// ── Cookie config ─────────────────────────────────────

const REFRESH_COOKIE = "refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ── Helpers ───────────────────────────────────────────

function toPublicUser(u: StoredUser) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    teams: [], // placeholder until team resolvers are wired
  };
}

function setRefreshCookie(ctx: Context, token: string) {
  ctx.res.cookie(REFRESH_COOKIE, token, COOKIE_OPTIONS);
}

function clearRefreshCookie(ctx: Context) {
  ctx.res.clearCookie(REFRESH_COOKIE, { path: "/" });
}

// ── Resolvers ─────────────────────────────────────────

export const authResolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) return null;

      const stored = users.get(ctx.user.userId);
      if (!stored) return null;

      return toPublicUser(stored);
    },
  },

  Mutation: {
    register: async (
      _: unknown,
      { input }: { input: { email: string; password: string; name?: string } },
      ctx: Context
    ) => {
      const parsed = registerSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          parsed.error.issues.map((i) => i.message).join(" ")
        );
      }
      const { email, password, name } = parsed.data;

      for (const u of users.values()) {
        if (u.email === email) {
          throw emailAlreadyExists();
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const id = String(nextId++);
      const now = new Date().toISOString();

      const newUser: StoredUser = {
        id,
        email,
        passwordHash,
        name: name ?? null,
        createdAt: now,
      };

      users.set(id, newUser);

      const tokenPayload = { userId: id, email };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      setRefreshCookie(ctx, refreshToken);

      return {
        accessToken,
        user: toPublicUser(newUser),
      };
    },

    login: async (
      _: unknown,
      { input }: { input: { email: string; password: string } },
      ctx: Context
    ) => {
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          parsed.error.issues.map((i) => i.message).join(" ")
        );
      }
      const { email, password } = parsed.data;

      let found: StoredUser | undefined;
      for (const u of users.values()) {
        if (u.email === email) {
          found = u;
          break;
        }
      }

      if (!found) {
        throw invalidCredentials();
      }

      const valid = await bcrypt.compare(password, found.passwordHash);
      if (!valid) {
        throw invalidCredentials();
      }

      const tokenPayload = { userId: found.id, email: found.email };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      setRefreshCookie(ctx, refreshToken);

      return {
        accessToken,
        user: toPublicUser(found),
      };
    },

    refresh: (_: unknown, __: unknown, ctx: Context) => {
      const token = ctx.req.cookies?.[REFRESH_COOKIE];
      if (!token) {
        throw refreshTokenExpired();
      }

      const payload = verifyRefreshToken(token);
      if (!payload) {
        clearRefreshCookie(ctx);
        throw refreshTokenExpired();
      }

      const stored = users.get(payload.userId);
      if (!stored) {
        clearRefreshCookie(ctx);
        throw refreshTokenExpired();
      }

      // Rotate: issue new pair
      const tokenPayload = { userId: stored.id, email: stored.email };
      const accessToken = signAccessToken(tokenPayload);
      const newRefreshToken = signRefreshToken(tokenPayload);

      setRefreshCookie(ctx, newRefreshToken);

      return {
        accessToken,
        user: toPublicUser(stored),
      };
    },

    logout: (_: unknown, __: unknown, ctx: Context) => {
      clearRefreshCookie(ctx);
      return { success: true, message: "Logged out successfully." };
    },
  },
};
