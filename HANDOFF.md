# Handoff to Opus: TTM Monorepo Deployment

## What Gemini Accomplished
I picked up where you left off and prepared the monorepo for deployment:

1. **Git Initialization & Push:** 
   - Initialized the git repository.
   - Committed the entire completed monorepo (all 5 phases).
   - Pushed the code to GitHub: [https://github.com/rautelaKamal/TTM.git](https://github.com/rautelaKamal/TTM.git)
2. **Build Verification:**
   - Ran `pnpm turbo run build` locally. 
   - **Result:** Successfully compiled all 3 packages (`@ttm/db`, `@ttm/api`, `@ttm/web`) with zero errors. The standalone Next.js build and Express `tsup` build are working perfectly.
3. **Docker Check:**
   - Attempted to start `docker-compose up -d` locally, but the Docker daemon wasn't running on the machine. Since the turbo build passed, I moved straight to Railway deployment prep.
4. **Railway CLI & Config Research:**
   - Installed the `@railway/cli` globally via npm.
   - Researched Railway's current deployment patterns for monorepos (2024/2025). 
   - **Crucial Finding:** Railway *does not* support deploying multiple services (API and Web) from a single `railway.toml` file at the root. The existing `railway.toml` syntax with `[services.api]` is invalid for Railway's current system.

## Where Gemini Left Off
I attempted to authenticate with the Railway CLI using `railway login --browserless`, but this requires the user to manually visit a link and enter a code. Since I cannot do that as an agent, the deployment process is paused here.

## What Opus Needs To Do Next
The user wants to deploy this to Railway and get the live production links. 

### 1. Fix the Railway Configuration
Delete or ignore the root `railway.toml`. Railway requires you to either:
- Create separate services in the Railway Dashboard UI and point their "Root Directory" to `apps/api` and `apps/web`.
- OR use the Railway CLI to link the GitHub repo and provision the services.

### 2. Deploy the Services via Railway Dashboard (Recommended)
Since the code is already pushed to GitHub, the easiest and most robust way to deploy is through the Railway Dashboard:

1. Instruct the user to go to the Railway Dashboard and create a new project.
2. **Database:** Add a PostgreSQL plugin.
3. **API Service:** 
   - Deploy from the GitHub repo.
   - In Settings > Service, set the **Root Directory** to `/apps/api`.
   - Railway will automatically detect the Dockerfile in `apps/api/Dockerfile`.
   - Set the required Environment Variables (`DATABASE_URL` from the Postgres plugin, `JWT_SECRET`, `CORS_ORIGIN`).
4. **Web Service:**
   - Deploy from the same GitHub repo again.
   - In Settings > Service, set the **Root Directory** to `/apps/web`.
   - Railway will detect `apps/web/Dockerfile`.
   - Set the required Environment Variables (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL` pointing to the API service's public domain).

### 3. Verify Deployment
Once both services are deployed, provide the user with the final public URLs and ensure they can sign up, create a project, and use the real-time Kanban board!
