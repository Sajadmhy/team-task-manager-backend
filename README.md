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

| Endpoint        | URL                                |
| --------------- | ---------------------------------- |
| GraphQL API     | `POST http://localhost:4000/graphql` |
| Playground      | `GET  http://localhost:4000/playground` |

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

| Concern         | Library                        |
| --------------- | ------------------------------ |
| HTTP server     | Express                        |
| API layer       | GraphQL (graphql-js)           |
| Schema building | @graphql-tools/schema          |
| Validation      | Zod                            |
| Auth tokens     | jsonwebtoken (JWT)             |
| Password hashing| bcryptjs                       |
| Language        | TypeScript                     |

---

## Environment Variables

See `.env-example` for all required variables:

| Variable                | Description                  | Default           |
| ----------------------- | ---------------------------- | ----------------- |
| `PORT`                  | Server port                  | `4000`            |
| `ACCESS_TOKEN_SECRET`   | JWT signing secret           | *(required)*      |
| `ACCESS_TOKEN_EXPIRY`   | Access token lifetime        | `15m`             |
| `REFRESH_TOKEN_SECRET`  | Refresh token signing secret | *(required)*      |
| `REFRESH_TOKEN_EXPIRY`  | Refresh token lifetime       | `7d`              |
| `NODE_ENV`              | `development` / `production` | `development`     |
