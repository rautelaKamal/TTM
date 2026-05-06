# Handoff to Opus: TTM Monorepo Deployment Finalization

## What Gemini Accomplished

I have resolved all the critical issues preventing the successful deployment of the TTM monorepo to Railway:

1. **API PORT Binding Fix:** 
   - Modified `apps/api/src/index.ts` to properly read the `PORT` environment variable injected by Railway (previously only read `API_PORT`), ensuring the API binds to the correct port and passes health checks.
2. **Railway Configuration Overhaul:**
   - Replaced the invalid multi-service syntax (`[services.api]`, `[services.web]`) in `railway.toml` which Railway no longer supports.
   - The new `railway.toml` now contains a generic single-service config with comprehensive deployment instructions embedded as comments.
3. **API Dockerfile Corrections:**
   - Fixed the `entrypoint.sh` copy instruction to correctly copy from the build stage (`--from=build`) rather than the local context (which isn't present in the runner stage).
   - Fixed the path for the Prisma generated client to ensure it's properly copied to `.prisma` under `node_modules`.
4. **Web Dockerfile Build-Time Variables:**
   - Added `ARG` and `ENV` for `NEXT_PUBLIC_API_URL` to ensure Next.js can inline the API URL into the static bundle during the `next build` phase.
5. **CI/CD Workflow Enhancements (`deploy.yml`):**
   - Fixed the `pnpm` version mismatch (from `8` to `9`) to align with `package.json`.
   - Added a PR trigger for CI checks to ensure PRs are tested.
   - Constrained the deploy jobs to only run on pushes to `main`.
   - Switched to using Railway service ID secrets (`RAILWAY_API_SERVICE_ID`, `RAILWAY_WEB_SERVICE_ID`) for proper routing during CLI deployment.
6. **Build Verification & Commit:**
   - Successfully ran `pnpm turbo run build` with zero errors across all three packages (`@ttm/db`, `@ttm/api`, `@ttm/web`).
   - Committed and pushed all fixes to the `main` branch.

## What Needs to Be Done Ahead

The remaining work requires manual configuration within the Railway Dashboard UI. 

### Step-by-Step Deployment Task
1. **Create the Project & Database:**
   - Create a new project named `TTM` on Railway.
   - Provision a new PostgreSQL database plugin.

2. **Deploy the API Service:**
   - Create a new service pointing to the GitHub repo (`rautelaKamal/TTM`).
   - In Settings > Source, leave Root Directory as `/` and set Dockerfile Path to `apps/api/Dockerfile`.
   - Add the necessary Environment Variables: `DATABASE_URL` (reference), `JWT_SECRET` (generate one), `PORT` (4000), `NODE_ENV` (production).

3. **Deploy the Web Service:**
   - Create a second service pointing to the same GitHub repo.
   - In Settings > Source, leave Root Directory as `/` and set Dockerfile Path to `apps/web/Dockerfile`.
   - Add the Environment Variables: `NEXTAUTH_SECRET` (same as JWT_SECRET), `JWT_SECRET`, `PORT` (3000), `NODE_ENV` (production).

4. **Wire the Domains Together:**
   - Generate public domains for both services via Settings > Networking.
   - Update the API service's `CORS_ORIGIN` to match the Web service's domain.
   - Update the Web service's `NEXTAUTH_URL` and `NEXT_PUBLIC_API_URL` to match their respective domains.
   - **Crucial:** Redeploy the Web service after setting `NEXT_PUBLIC_API_URL` so the Next.js build can capture the correct URL.

5. **Optional: CI/CD Integration:**
   - Generate a Railway Project Token and retrieve the API and Web Service IDs from their settings.
   - Add these as repository secrets in GitHub (`RAILWAY_TOKEN`, `RAILWAY_API_SERVICE_ID`, `RAILWAY_WEB_SERVICE_ID`) to enable the existing GitHub Actions workflow.

6. **End-to-End Verification:**
   - Confirm the API health check (`/health`).
   - Verify the Web application (SignUp, Login, creating a project, and the real-time Kanban board).
