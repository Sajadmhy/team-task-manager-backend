import type { Context } from "../context";
import * as authService from "../services/auth.service";

// ── Cookie config (transport concern — stays in the resolver) ──

const REFRESH_COOKIE = "refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setRefreshCookie(ctx: Context, token: string) {
  ctx.res.cookie(REFRESH_COOKIE, token, COOKIE_OPTIONS);
}

function clearRefreshCookie(ctx: Context) {
  ctx.res.clearCookie(REFRESH_COOKIE, { path: "/" });
}

// ── Resolvers (thin — delegate to service) ────────────────

export const authResolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) return null;
      return authService.getMe(ctx.user.userId);
    },
  },

  Mutation: {
    register: async (_: unknown, { input }: { input: unknown }, ctx: Context) => {
      const result = await authService.register(input);
      setRefreshCookie(ctx, result.refreshToken);
      return { accessToken: result.accessToken, user: result.user };
    },

    login: async (_: unknown, { input }: { input: unknown }, ctx: Context) => {
      const result = await authService.login(input);
      setRefreshCookie(ctx, result.refreshToken);
      return { accessToken: result.accessToken, user: result.user };
    },

    refresh: (_: unknown, __: unknown, ctx: Context) => {
      const token = ctx.req.cookies?.[REFRESH_COOKIE];
      try {
        const result = authService.refresh(token);
        setRefreshCookie(ctx, result.refreshToken);
        return { accessToken: result.accessToken, user: result.user };
      } catch (err) {
        clearRefreshCookie(ctx);
        throw err;
      }
    },

    logout: (_: unknown, __: unknown, ctx: Context) => {
      clearRefreshCookie(ctx);
      return { success: true, message: "Logged out successfully." };
    },
  },
};
