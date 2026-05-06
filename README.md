# Team Task Manager

A full-stack task management application built as a job assignment submission. The stack is Next.js 14 (App Router) on the frontend, Express.js REST API on the backend, PostgreSQL via Prisma ORM, and Socket.IO for real-time updates. The codebase is organized as a TurboRepo monorepo with shared packages for the database client, TypeScript config, and ESLint config.

## Features

- Role-based auth (Admin / Member) with JWT — separate token for browser sessions (NextAuth) and API access (Express)
- Project and team management — Admins create projects and add members by email
- Task tracking with Kanban board (drag-and-drop via @dnd-kit)
- Real-time task updates via Socket.IO (room per project, JWT-authenticated connections)
- Activity log per task (field-level change history — what changed, old value → new value)
- Dashboard with overdue task tracking and per-project progress bars
- Optimistic UI updates with snapshot rollback on API failure (Zustand)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS v3 |
| Forms | react-hook-form + Zod |
| State | Zustand |
| Drag & Drop | @dnd-kit/core |
| Backend | Express.js, Node 20 |
| Auth | NextAuth.js (browser), jsonwebtoken (API) |
| Database | PostgreSQL 16, Prisma ORM |
| Real-time | Socket.IO |
| Monorepo | TurboRepo, pnpm workspaces |
| Deployment | Docker, Railway, GitHub Actions |

## Local Setup

Prerequisites: Node 20+, pnpm 8+, Docker Desktop.

```bash
git clone https://github.com/your-username/ttm.git
cd ttm

pnpm install

cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET and JWT_SECRET to random strings
# Example: openssl rand -base64 32

docker compose up -d          # starts PostgreSQL on :5432

pnpm --filter @ttm/db exec prisma migrate dev

pnpm turbo dev                # api on :4000, web on :3000
```

Open http://localhost:3000, sign up as Admin to get started.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing Express API JWTs |
| `NEXTAUTH_SECRET` | Secret for NextAuth session encryption |
| `NEXTAUTH_URL` | Base URL of the Next.js app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Express API URL, exposed to the browser (e.g. `http://localhost:4000`) |
| `API_PORT` | Port for the Express server (default: `4000`) |
| `CORS_ORIGIN` | Allowed origin for CORS (e.g. `http://localhost:3000`) |

## Architecture Notes

**Why TurboRepo.** Both the Next.js frontend and Express backend import `@ttm/db` to get the Prisma client and generated types. Without a monorepo, you'd duplicate the schema or publish to a registry. TurboRepo also parallelizes builds — `turbo build` compiles the database package first, then the API and web in parallel. A single `pnpm install` at the root handles all dependencies.

**JWT strategy.** There are two separate token systems. NextAuth manages a session JWT stored in an HTTP-only cookie — this handles browser auth (login state, route protection via middleware). When a user signs in, the NextAuth `jwt` callback also mints a second token signed with `JWT_SECRET`. This API token is attached to every outgoing Axios request via an interceptor. The Express API verifies it with the same secret. This keeps Express fully stateless with no NextAuth dependency.

**Socket.IO rooms.** Each project gets a room (`project:{id}`). When a user opens a Kanban board, the client emits `project:join` to subscribe. All task mutations in Express (`create`, `update`, `delete`) broadcast to the project room via `req.app.get("io")`. The `io` instance is attached to Express via `app.set("io", io)` at startup, avoiding circular imports between route files and the socket module. Socket connections are authenticated with the same `JWT_SECRET` via a handshake middleware.

**Optimistic updates.** The Zustand `taskStore` saves a snapshot of the current task array before every `moveTask` call, applies the status/position change to the UI immediately, then sends the PATCH request. If the API responds with an error, the store restores the snapshot. This makes the Kanban board feel instant while staying consistent with the server. Socket.IO events from other users are merged into the store via `syncFromSocket` to handle concurrent edits.

## What I'd Improve With More Time

1. **WebSocket reconnection handling.** If the Socket.IO connection drops, the client doesn't attempt to rejoin project rooms after reconnecting. I'd add a `reconnect` event listener that re-emits `project:join` for the currently active project, plus a visual indicator showing connection status.

2. **E2E tests.** The optimistic update + rollback flow and the real-time broadcast path aren't covered by automated tests. I'd add Playwright tests that open two browser contexts, move a task in one, and verify it appears in the other. The RBAC edge cases (member trying to update another member's task) would also get dedicated API integration tests.

3. **Per-project roles.** The current schema has a global `Role` (Admin/Member) on the User model. A more realistic system would add a `role` column to the `ProjectMember` table so a user could be Admin in one project and Member in another. The join table is already there — it just needs the column and updated RBAC middleware.

4. **Task ordering persistence.** The `position` field exists on tasks but drag-and-drop updates position via individual PATCH calls. A bulk reorder endpoint (`PATCH /projects/:id/tasks/reorder` accepting `[{id, position}]`) would be more efficient when rearranging multiple cards within the same column, reducing N API calls to one.
