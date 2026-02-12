// ── Shared in-memory stores (replace with DB later) ───────

// ── User ──────────────────────────────────────────────────

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: string;
}

export const users: Map<string, StoredUser> = new Map();

// ── Team ──────────────────────────────────────────────────

export interface StoredTeam {
  id: string;
  name: string;
  createdAt: string;
}

export const teams: Map<string, StoredTeam> = new Map();

// ── Team Member ───────────────────────────────────────────

export type TeamRole = "ADMIN" | "USER";

export interface StoredTeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  joinedAt: string;
}

export const teamMembers: Map<string, StoredTeamMember> = new Map();

// ── ID generator ─────────────────────────────────────────

let _nextId = 1;

export function nextId(): string {
  return String(_nextId++);
}

// ── Lookup helpers ───────────────────────────────────────

export function findMemberByUserAndTeam(
  userId: string,
  teamId: string
): StoredTeamMember | undefined {
  for (const m of teamMembers.values()) {
    if (m.userId === userId && m.teamId === teamId) return m;
  }
  return undefined;
}

export function getMembersForTeam(teamId: string): StoredTeamMember[] {
  const result: StoredTeamMember[] = [];
  for (const m of teamMembers.values()) {
    if (m.teamId === teamId) result.push(m);
  }
  return result;
}

export function getTeamsForUser(userId: string): StoredTeamMember[] {
  const result: StoredTeamMember[] = [];
  for (const m of teamMembers.values()) {
    if (m.userId === userId) result.push(m);
  }
  return result;
}
