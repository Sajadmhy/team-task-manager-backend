import type { Context } from "../context";
import { unauthenticated, unauthorized } from "../errors";
import { findMemberByUserAndTeam, type TeamRole } from "../store";
import type { TokenPayload } from "./jwt"; // direct sibling import (avoid circular barrel)

export function requireAuth(ctx: Context): TokenPayload {
  if (!ctx.user) throw unauthenticated();
  return ctx.user;
}

export function requireTeamMember(ctx: Context, teamId: string) {
  const user = requireAuth(ctx);
  const member = findMemberByUserAndTeam(user.userId, teamId);
  if (!member) {
    throw unauthorized("You are not a member of this team.");
  }
  return member;
}

export function requireRole(
  ctx: Context,
  teamId: string,
  ...roles: TeamRole[]
) {
  const member = requireTeamMember(ctx, teamId);
  if (!roles.includes(member.role)) {
    throw unauthorized(
      `This action requires one of the following roles: ${roles.join(", ")}.`
    );
  }
  return member;
}
