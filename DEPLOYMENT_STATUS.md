# TTM Monorepo Deployment Status

## What We Accomplished

I have successfully prepared the entire TTM monorepo for production deployment. All configurations have been verified, and the codebase is completely production-ready:

1. **Full Codebase Audit & Fixes**: 
   - Verified the Dockerfiles for both the API (`apps/api/Dockerfile`) and Web (`apps/web/Dockerfile`). They correctly handle multi-stage builds and Prisma generation.
   - Ensured the `PORT` environment variables are correctly mapped for Railway's dynamic port assignment.
   - Verified the `next.config.js` is set to `output: "standalone"` for Next.js, which is required for Docker deployments.
   - Checked the Express API and NextAuth configurations to ensure they use the correct production environment variables.
   
2. **Build Verification**: 
   - Ran `pnpm turbo run build` locally. All three packages (`@ttm/db`, `@ttm/api`, `@ttm/web`) compiled successfully with zero errors.

3. **Version Control**: 
   - Pushed all final fixes to the `origin/main` branch (commit `9e1bde1`). The GitHub repository is fully up to date.

4. **CI/CD Configuration**: 
   - The `.github/workflows/deploy.yml` is correctly configured to use Railway CLI for automated deployments upon pushes to the `main` branch.

---

## The Current Blocker: Railway Trial Expired

We attempted to initialize the project on Railway via the CLI, but encountered the following error:
> `Your trial has expired. Please select a plan to continue using Railway.`

### Will deleting old projects work?
**Unfortunately, no.** Railway's trial limits are tied to the *account level*, not the project level. Once the trial expires (which usually happens based on time or execution credits consumed), you cannot create new projects—even if you delete old ones—without upgrading.

### What can be done if they require a live Railway link?

If the requirement explicitly demands a **Railway link**, you have two options:

1. **Upgrade to the Developer/Hobby Plan (Recommended)**
   - Go to [railway.com/account/billing](https://railway.com/account/billing) and add a payment method.
   - The Developer/Hobby plan costs $5/month. Once active, the deployment will work seamlessly using the steps below.

2. **Create a New Railway Account**
   - You can create a fresh Railway account using a different GitHub account or email address to get a new trial period.
   - *Note: Railway has strict anti-abuse systems, so this might require a different phone number for verification.*

---

## What Needs To Be Done Next (Deployment Steps)

Once you have an active Railway plan (either by upgrading or using a new account), run these exact commands in your terminal from the project root:

### 1. Initialize the Project & Database
```bash
railway login --browserless  # If using a new account
railway init --name TTM
railway add --database postgres
```

### 2. Deploy the API Service
```bash
railway service create api
railway link --service api
railway variables set \
  JWT_SECRET="$(openssl rand -base64 32)" \
  PORT=4000 \
  NODE_ENV=production \
  CORS_ORIGIN="https://PLACEHOLDER"

railway up --service api --detach
```

### 3. Deploy the Web Service
```bash
railway service create web
railway link --service web

# IMPORTANT: Copy the JWT_SECRET you generated in Step 2 and use it here
railway variables set \
  NEXTAUTH_SECRET="<YOUR_COPIED_JWT_SECRET>" \
  JWT_SECRET="<YOUR_COPIED_JWT_SECRET>" \
  PORT=3000 \
  NODE_ENV=production \
  NEXTAUTH_URL="https://PLACEHOLDER" \
  NEXT_PUBLIC_API_URL="https://PLACEHOLDER"

railway up --service web --detach
```

### 4. Wire the Domains Together
```bash
# Generate public URLs
railway domain --service api
railway domain --service web
```

*Look at the output to get the generated domains (e.g., `ttm-api-production.up.railway.app` and `ttm-web-production.up.railway.app`).*

```bash
# Update API CORS
railway link --service api
railway variables set CORS_ORIGIN="https://<YOUR_WEB_DOMAIN>"

# Update Web URLs
railway link --service web
railway variables set \
  NEXTAUTH_URL="https://<YOUR_WEB_DOMAIN>" \
  NEXT_PUBLIC_API_URL="https://<YOUR_API_DOMAIN>"

# CRITICAL: Redeploy the Web service so Next.js bakes in the API URL
railway up --service web --detach
```

### 5. Setup CI/CD (Optional but Recommended)
Get your Railway tokens from the dashboard and add them to your GitHub Repository Secrets:
- `RAILWAY_TOKEN`
- `RAILWAY_API_SERVICE_ID`
- `RAILWAY_WEB_SERVICE_ID`

Once these are set, any future `git push` to the `main` branch will automatically deploy to Railway!
