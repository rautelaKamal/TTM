# Handoff to Next Assistant: TTM Monorepo Deployment Finalization

## What Has Been Accomplished in This Session

We have successfully resolved the authentication blockers and progressed significantly through the Railway deployment process using the CLI:

1. **Account Access**: Logged out of the expired account and successfully authenticated with the new account (`rautelakamal69@gmail.com`).
2. **Project Initialization**: Created a new Railway project named `TTM` and provisioned a PostgreSQL database plugin.
3. **API Service Setup**:
   - Created the `api` service.
   - Configured environment variables: `JWT_SECRET` (auto-generated), `PORT=4000`, `NODE_ENV=production`, and temporarily `CORS_ORIGIN=https://PLACEHOLDER`.
   - Linked the PostgreSQL `DATABASE_URL` to the API service.
   - Set `RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile`.
   - Successfully triggered the deployment for the API (`railway up --service api`).
4. **Web Service Setup**:
   - Created the `web` service.
   - Configured environment variables: `JWT_SECRET` and `NEXTAUTH_SECRET` (matching API), `PORT=3000`, `NODE_ENV=production`, and placeholders for URLs.
   - Set `RAILWAY_DOCKERFILE_PATH=apps/web/Dockerfile`.
   - Successfully triggered the deployment for the Web service (`railway up --service web`).
5. **Networking (Domains)**:
   - Generated public domains for both services:
     - **API Domain**: `https://api-production-2e3f.up.railway.app`
     - **Web Domain**: `https://web-production-469c7.up.railway.app`
   - Updated the `CORS_ORIGIN` variable on the API service to allow requests from the new Web Domain.

## Where We Left Off

The system halted during the command to update the environment variables for the Web service (user denied permission for the CLI command `railway service link web`). The API service is fully configured, but the Web service still has placeholder URLs for its environment variables.

## What Needs to Be Done Next

To finalize the deployment, the next assistant needs to execute the following steps:

### 1. Update Web Service Environment Variables
The Next.js frontend needs to know its own URL and the API's URL. Run the following command via the Railway CLI (or do it in the Railway Dashboard UI):

```bash
railway service link web
railway variables set NEXTAUTH_URL="https://web-production-469c7.up.railway.app" NEXT_PUBLIC_API_URL="https://api-production-2e3f.up.railway.app"
```

### 2. Redeploy the Web Service (CRITICAL)
Next.js bakes `NEXT_PUBLIC_` environment variables into the static bundle during the build phase. Therefore, **you must trigger a redeployment** of the Web service after setting these variables:

```bash
railway up --service web --detach
```

### 3. Verify End-to-End Functionality
Once the web service is redeployed and running:
- Visit `https://web-production-469c7.up.railway.app`
- Test the signup/login flow.
- Ensure you can create projects and tasks.
- Verify real-time updates on the Kanban board (which rely on the websocket connection to the API).

### 4. Setup CI/CD (Optional but Recommended)
To enable automated deployments via GitHub Actions:
- Generate a Railway Project Token.
- Retrieve the API and Web Service IDs from the Railway Dashboard.
- Add these as repository secrets in GitHub: `RAILWAY_TOKEN`, `RAILWAY_API_SERVICE_ID`, `RAILWAY_WEB_SERVICE_ID`.
