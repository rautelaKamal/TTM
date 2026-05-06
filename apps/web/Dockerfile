# ---- Stage 1: deps ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/web/package.json ./apps/web/

RUN corepack enable && pnpm install --frozen-lockfile

# ---- Stage 2: build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @ttm/db exec prisma generate
RUN pnpm --filter @ttm/web build

# ---- Stage 3: runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output in a monorepo nests under apps/web
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
