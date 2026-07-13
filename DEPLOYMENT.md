# Deployment Guide

This document provides step-by-step instructions for deploying **WashU Sim Intelligence** to the Cloudflare-native production stack.

## 🏛️ Architecture Overview
The platform has been migrated from legacy Supabase infrastructure to a high-concurrency Cloudflare architecture:
- **Frontend**: React SPA deployed via Cloudflare Pages.
- **Backend API**: Cloudflare Workers (Hono).
- **Database**: Cloudflare D1 (Relational SQL with FTS5).
- **Object Storage**: Cloudflare R2 (Session documents/media).
- **History/Audit**: Automated D1 Triggers (Safety Audit Logs).
- **Security**: Cloudflare KV, Secrets, and Turnstile.

---

## 🌐 1. Frontend Deployment (Cloudflare Pages)

### Configuration
The frontend is built using Vite and deployed directly to the Cloudflare network from the `main` branch.
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Native Routing**: Automatically handled by Cloudflare Pages.

### Automated Deployment
Connecting the GitHub repository to Cloudflare Pages handles all production builds and edge deployments automatically on push.

### Pages Function API Binding
The Pages Function proxy should call the backend through a Cloudflare service
binding named `WASHU_SIM_INTEL_API` that points to the `washu-sim-intel`
Worker. The proxy fails closed with `503` if neither the service binding nor an
explicit `BACKEND_URL` override is configured.

---

## ⚡ 2. Backend Deployment (Cloudflare Workers)

### Prerequisites
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`npx wrangler login`).
- A Cloudflare Account with D1, R2, and KV namespaces enabled.

### Database Setup (D1)
1.  **Create Database**:
    ```bash
    npx wrangler d1 create washusim-db
    ```
2.  **Initialize Schema for a New Database**:
    ```bash
    cd worker
    npx wrangler d1 execute washusim-db --file=./schema.sql --remote
    ```
3.  **Apply Migrations for an Existing Database**:
    ```bash
    cd worker
    npx wrangler d1 migrations apply washu_sim_db --remote
    ```
    Do not apply historical migrations immediately after loading the current `schema.sql` into a brand-new database; the schema already includes those columns.

### Storage Setup (R2)
1.  **Create Bucket**:
    ```bash
    npx wrangler r2 bucket create washusim-docs
    ```

### Intelligence Setup (AI & Vectorize)
1.  **Enable Workers AI**: No separate setup usually needed for standard accounts.
2.  **Create Vector Index**:
    ```bash
    npx wrangler vectorize create sim_search --dimensions=384 --metric=cosine
    ```

### Deployment
Update the `wrangler.toml` file in the `worker/` directory with your resource IDs, then run:
```bash
cd worker
npm run deploy
```

4. **Initialize Vector Index**:
   After deployment, visit **Settings > Admin** in the app and click **Re-index Library** to populate the semantic store with existing reports.

---

## 🔑 3. Environment Variables & Secrets

### Required Backend Secrets (Workers)
Configure the following secrets in your Cloudflare Worker:
```bash
# Preferred: OpenAI Responses API for report generation, Q&A, and LST extraction
npx wrangler secret put OPENAI_API_KEY

# Optional fallback: keep Gemini available when OPENAI_API_KEY is absent
npx wrangler secret put GEMINI_API_KEY

# Cloudflare Turnstile Secret Key for spam protection
npx wrangler secret put TURNSTILE_SECRET_KEY

# Admin token for protected administrative routes
npx wrangler secret put ADMIN_TOKEN
```

The Worker automatically selects OpenAI when `OPENAI_API_KEY` exists; otherwise it uses Gemini. To make the choice explicit, set `AI_PROVIDER` to `openai` or `gemini` in `[vars]` in `worker/wrangler.toml`. Optional `AI_MODEL` and `AI_LIGHTWEIGHT_MODEL` variables override the provider defaults.

### Frontend Configuration
The frontend uses `/api` in production so requests pass through the Cloudflare Pages Function proxy. For local development, set `VITE_API_BASE` or run the Worker at `http://localhost:8787`.

---

## 🔒 Security & Governance
- **Data Minimization**: Automatically strips base64 image data before SQL persistence to optimize D1 storage and improve UI response times.
- **Audit Logging**: All administrative actions are recorded in the central D1 `audit_logs` table.
- **Administrative Access**: Clinical data endpoints require `X-Admin-Token`; upload and generation writes also require `X-Turnstile-Token`.
- **Clinical Data Handling**: Do not enter patient identifiers or protected health information unless the deployment has been reviewed under the institution's privacy, retention, and access-control requirements.
- **Zero Trust**: Cloudflare Access should protect `intel.washuemsim.org`, `washusimintelligence.pages.dev`, and Pages preview deployment URLs.

---

**Built for Clinical Safety, Powered by Intelligence.**  
© 2026 Washington University School of Medicine.
