import bcrypt from "bcryptjs";
import { signAccessToken } from "../utils/jwt";
import { registerSchema, loginSchema } from "../validation/auth";
import {
  validationError,
  emailAlreadyExists,
  invalidCredentials,
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

// Helper to strip sensitive fields before returning to client
function toPublicUser(u: StoredUser) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    teams: [], // placeholder until team resolvers are wired
  };
}

// ── Resolvers ─────────────────────────────────────────

export const authResolvers = {
  Query: {
    me: (_: unknown, __: unknown, context: Context) => {
      if (!context.user) return null;

      const stored = users.get(context.user.userId);
      if (!stored) return null;

      return toPublicUser(stored);
    },
  },

  Mutation: {
    register: async (
      _: unknown,
      { input }: { input: { email: string; password: string; name?: string } }
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

      const accessToken = signAccessToken({
        userId: id,
        email,
      });

      return {
        accessToken,
        user: toPublicUser(newUser),
      };
    },

    login: async (
      _: unknown,
      { input }: { input: { email: string; password: string } }
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

      const accessToken = signAccessToken({
        userId: found.id,
        email: found.email,
      });

      return {
        accessToken,
        user: toPublicUser(found),
      };
    },
  },
};
