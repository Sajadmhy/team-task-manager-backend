# Team Task Manager — Backend

A **GraphQL API** for managing teams, members, and tasks with role-based access
control, built with Express, TypeScript, and Zod validation.

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env-example .env

# Run in development (hot-reload)
npm run dev

# Build for production
npm run build && npm start
```

| Endpoint    | URL                                    |
| ----------- | -------------------------------------- |
| GraphQL API | `POST http://localhost:4000/graphql`   |
| Playground  | `GET  http://localhost:4000/playground` |

---

## Why GraphQL?

This project manages **deeply related entities** — users belong to teams, teams
contain tasks, tasks track assignment history, and every object links back to
the user who changed it. A REST API would need a separate endpoint for each
relationship (or rely on heavy query-string includes), and the client would
still over-fetch or under-fetch depending on the view.

GraphQL solves this naturally:

- **One request, exact shape.** The client asks for exactly the fields it needs
  — a task list view fetches `title` and `status`; a detail view adds
  `assignedUser { name }` and `assignmentHistory` — all in the same endpoint.
- **Nested resolution.** Type resolvers like `Task.team` and
  `Task.assignmentHistory` let the schema mirror the domain model directly.
  The client navigates relationships without knowing about foreign keys.
- **Schema as contract.** The SDL (`schema/typeDefs.ts`) doubles as living
  documentation. Both client and server agree on types, nullability, and
  available operations at compile time.
- **Playground for free.** During development, `/playground` gives an
  interactive API explorer with auto-complete — no Postman collections needed.

---

## How Auth Works (5 Steps)

```
Client                          Server
──────                          ──────
1. POST /graphql  ──────────►  register / login mutation
   { email, password }         validates input (Zod), hashes password (bcrypt),
                               stores user in the data store

2.                ◄──────────  returns { accessToken } in JSON body
                               + sets refresh_token as an HttpOnly cookie

3. POST /graphql  ──────────►  any protected query / mutation
   Authorization: Bearer <accessToken>
                               context.ts extracts the token from the header,
                               verifies it with jwt.verify(), and populates
                               ctx.user = { userId, email }

4. (token expires)
   POST /graphql  ──────────►  refresh mutation
   Cookie: refresh_token=…     reads the HttpOnly cookie, verifies it,
                               issues a new access + refresh token pair

5.                ◄──────────  returns new { accessToken }
   POST /graphql  ──────────►  logout mutation
                               clears the refresh_token cookie
```

**Key details:**

- **Access tokens** are short-lived (default 15 min) and sent in the
  `Authorization` header — never stored in cookies.
- **Refresh tokens** are long-lived (default 7 days) and stored in an
  `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie so JavaScript
  cannot read them.
- Every protected resolver calls `requireAuth(ctx)` which throws
  `UNAUTHENTICATED` if `ctx.user` is null.

---

## How Roles Are Enforced

The system uses a **per-team role model**. A user can be `ADMIN` in one team
and `USER` in another. Enforcement happens through three layered guard
functions in `utils/auth.ts`:

```
requireAuth(ctx)
  └─► requireTeamMember(ctx, teamId)
        └─► requireRole(ctx, teamId, "ADMIN")
```

1. **`requireAuth`** — ensures a valid JWT is present. Throws
   `UNAUTHENTICATED` otherwise.
2. **`requireTeamMember`** — calls `requireAuth`, then looks up the caller's
   membership in the target team. Throws `UNAUTHORIZED` if they are not a
   member.
3. **`requireRole`** — calls `requireTeamMember`, then checks the member's
   `role` against a whitelist. Throws `UNAUTHORIZED` if the role doesn't
   match.

**What each role can do:**

| Action                         | `USER` | `ADMIN` |
| ------------------------------ | :----: | :-----: |
| View team tasks & members      |   yes  |   yes   |
| Create a task                  |   yes  |   yes   |
| Update own assigned task       |   yes  |   yes   |
| Update any task                |   --   |   yes   |
| Assign / unassign a task       |   --   |   yes   |
| Delete a task                  |   --   |   yes   |
| Add / remove members           |   --   |   yes   |
| Change member roles            |   --   |   yes   |
| Delete the team                |   --   |   yes   |

An additional safety check prevents the **last admin** from demoting or
removing themselves, so a team can never become un-manageable.

---

## A Trade-Off I Made

### In-memory store instead of a real database

All data lives in plain `Map<string, T>` objects (`src/store.ts`). Data is lost
when the process restarts.

**Why I chose this:**

- It keeps the focus on **API design, auth flow, and role logic** — the things
  that actually demonstrate backend thinking — without coupling to a specific
  database, ORM, or migration tool.
- It makes the project instantly runnable: `npm install && npm run dev`. No
  Docker, no DB setup, no seed scripts.
- The service layer (`services/*.service.ts`) is already separated from the
  store, so swapping in Prisma / Drizzle / raw SQL only means changing
  `store.ts` and the lookup helpers — resolvers and services stay untouched.

**The cost:**

- No persistence, no concurrent-safe writes, no indexing. The linear scans
  in lookup helpers (e.g. `findMemberByUserAndTeam`) would be unacceptable at
  real scale.
- No transactions — a crash mid-`deleteTeam` could leave orphaned records
  (though with an in-memory Map that's a moot point since everything is gone).

---

## What I'd Improve With More Time

### Add a real-time subscription layer

Right now, if User A assigns a task to User B, User B only sees the change the
next time they actively query for it. With GraphQL **Subscriptions** (over
WebSocket), the server could push updates the moment they happen:

```graphql
subscription {
  taskUpdated(teamId: "3") {
    id
    status
    assignedUser { name }
  }
}
```

This would make the app feel collaborative in real-time — task board columns
update live, assignment notifications appear instantly, and status changes
propagate across every connected client without polling.

Implementation-wise, this means:

1. Swapping the raw `graphql()` call for a library like `graphql-ws` that
   supports the subscriptions protocol.
2. Adding a pub/sub layer (even an in-memory `EventEmitter` to start, Redis
   for production).
3. Extending the schema with `Subscription` type resolvers that emit events
   from the existing service mutations.

The service/resolver separation already in place means the mutation logic
wouldn't change — it would just publish an event after each write.

---

## Project Structure

```
src/
├── index.ts              # Express server & GraphQL endpoint
├── context.ts            # Builds per-request GraphQL context
├── errors.ts             # AppError class & error-code factories
├── store.ts              # In-memory data store (replace with DB later)
│
├── schema/               # GraphQL type definitions
│   ├── index.ts          # ← barrel export
│   └── typeDefs.ts       # SDL schema (queries, mutations, types)
│
├── resolvers/            # GraphQL resolvers (thin — delegate to services)
│   ├── index.ts          # Merges all resolver maps
│   ├── auth.ts
│   ├── task.ts
│   └── team.ts
│
├── services/             # Business logic layer
│   ├── index.ts          # ← barrel export
│   ├── auth.service.ts
│   ├── task.service.ts
│   └── team.service.ts
│
├── utils/                # Shared helpers
│   ├── index.ts          # ← barrel export
│   ├── auth.ts           # requireAuth / requireRole guards
│   ├── jwt.ts            # JWT sign & verify helpers
│   ├── logger.ts         # Structured console logger
│   └── validate.ts       # Zod validation wrapper
│
└── validation/           # Zod schemas for input validation
    ├── index.ts          # ← barrel export
    ├── auth.ts
    ├── task.ts
    └── team.ts
```

### Barrel Exports (index.ts files)

Every folder exposes a single **barrel `index.ts`** that re-exports the
folder's public API. This gives two benefits:

1. **Cleaner imports** — consumers import from the folder, not from individual
   files:

   ```ts
   // Before (deep path)
   import { validate } from "../utils/validate";
   import { requireAuth } from "../utils/auth";

   // After (barrel)
   import { validate, requireAuth } from "../utils";
   ```

2. **Encapsulation** — internal helpers stay hidden; only what the barrel
   exports is part of the folder's public contract.

---

## Error Handling

All errors flow through a single `AppError` class (`src/errors.ts`) with a
typed `ErrorCode` enum. The GraphQL endpoint normalises every error so the
client always receives:

```json
{
  "extensions": {
    "code": "NOT_FOUND",
    "status": 404
  }
}
```

Unexpected errors are masked in production and logged via the structured logger.

---

## Logging

A lightweight structured logger lives in `src/utils/logger.ts`. Each log line
includes a **timestamp**, **level**, and **module label**:

```
[2026-02-14T10:30:00.000Z] [INFO]  [Auth]   User registered: id=1 email=a@b.com
[2026-02-14T10:30:01.000Z] [WARN]  [GraphQL] AppError [NOT_FOUND] path=task
[2026-02-14T10:30:02.000Z] [ERROR] [GraphQL] Unhandled resolver error at path=tasks
```

Pre-built loggers are available for common modules:

```ts
import { logger } from "../utils";

logger.auth.info("User logged in");
logger.task.error("Something went wrong", error);
```

You can also create a scoped logger for any new module:

```ts
import { createLogger } from "../utils";
const log = createLogger("MyModule");
```

---

## Tech Stack

| Concern          | Library               |
| ---------------- | --------------------- |
| HTTP server      | Express               |
| API layer        | GraphQL (graphql-js)  |
| Schema building  | @graphql-tools/schema |
| Validation       | Zod                   |
| Auth tokens      | jsonwebtoken (JWT)    |
| Password hashing | bcryptjs              |
| Language         | TypeScript            |

---

## Environment Variables

See `.env-example` for all required variables:

| Variable               | Description                  | Default       |
| ---------------------- | ---------------------------- | ------------- |
| `PORT`                 | Server port                  | `4000`        |
| `ACCESS_TOKEN_SECRET`  | JWT signing secret           | *(required)*  |
| `ACCESS_TOKEN_EXPIRY`  | Access token lifetime        | `15m`         |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret | *(required)*  |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime       | `7d`          |
| `NODE_ENV`             | `development` / `production` | `development` |
