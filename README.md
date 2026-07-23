# WUEM Sim Intel

**WUEM Sim Intel** is a simulation improvement and Latent Safety Threat (LST) management system developed for the **Washington University School of Medicine, Department of Emergency Medicine**.

The platform helps simulation teams turn high-fidelity clinical scenarios into usable safety work: structured post-session reports, reliable LST identification, follow-up tracking, searchable institutional learning, and documentation that can be shared with educators, safety leaders, and operational stakeholders.

**Current release: v3.9.0** — provider-flexible AI report drafting, case-summary context, a redesigned clinical workspace, persistent dark mode, and a hardened Cloudflare deployment path.

---

## 🏛️ Project Overview

WUEM Sim Intel is specialized for clinical simulation programs that need more than a written debrief summary. It supports a **Just Culture** approach by helping teams document what happened, identify system vulnerabilities, assign follow-up, and preserve lessons learned across repeated simulations.

The system is designed around the practical workflow of a simulation program:

- Capture what occurred during a session.
- Generate a polished post-session report.
- Identify and classify LSTs.
- Track mitigation status and institutional follow-up.
- Search across prior sessions, scenarios, and safety findings.
- Export clean documents with supporting photos and media.

### Key Capabilities

*   **🏥 LST Identification & Management**: Centralized tracking for **Latent Safety Threats** with categories, severity, status, mitigation notes, and institutional audit history.
*   **📋 Simulation Report Generation**: Converts session notes into professional reports grounded in simulation education, safety improvement, and Just Culture principles.
*   **✅ Follow-Up Workflow Support**: Keeps safety findings visible after the session so unresolved threats can be reviewed, escalated, and closed.
*   **🔍 Institutional Learning Search**: Search across prior scenarios, reports, and safety findings to recognize repeated patterns and recurring operational risks.
*   **📸 Session Media Documentation**: Attach simulation photos and high-resolution media, then include them in exported reports as polished photo collages.
*   **🤖 Provider-Flexible Clinical Assistant**: Uses OpenAI or Gemini for report drafting and LST extraction, with retrieval over prior simulation evidence to support faster synthesis.
*   **🧾 Case-Aware Drafting**: Includes concise case-file summaries in the report prompt so generated drafts reflect the selected scenarios without overwhelming the model context.
*   **🌗 Accessible Clinical Workspace**: A responsive clinical-editorial interface with shared, persistent light and dark themes across the simulation suite.

---

## 🏗️ System Architecture

Built on a Cloudflare-native stack for reliability, fast access, and secure clinical education workflows:

- **Frontend**: React (Vite + TypeScript + Tailwind) deployed to Cloudflare Pages at `https://intel.wuemsim.org`.
- **Backend API**: Cloudflare Workers (Hono) running at the edge. The public `workers.dev` route is disabled, and the Pages Function proxy calls the Worker through the `WASHU_SIM_INTEL_API` service binding.
- **Decision Support**: 
  - **Library Q&A**: Retrieval-augmented answers over the local simulation knowledge base.
  - **Report Drafting**: Provider-agnostic asynchronous streaming via the **OpenAI Responses API** or **Google Gemini**.
  - **Semantic Indexing**: **Cloudflare Vectorize** with **Workers AI** for retrieval across scenarios, reports, and LST records.
- **Data Primitives**: 
  - **Relational SQL**: Cloudflare D1 (`washu_sim_db`)
  - **Object Storage**: Cloudflare R2 (`washu-sim-intel-storage-2026`)
  - **Metadata Cache**: Cloudflare KV (`RATELIMIT_V2`)
  - **Vector Index**: Cloudflare Vectorize (`sim_search`)

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v20 or higher.
- **Cloudflare Account**: With access to D1, R2, Vectorize, Workers AI, KV, Pages, and Workers.
- **Secrets**: 
  - `OPENAI_API_KEY`: Preferred provider for report generation, library Q&A, and LST extraction.
  - `GEMINI_API_KEY`: Optional fallback provider.
  - `TURNSTILE_SECRET_KEY`: For spam protection on generation endpoints.
  - `ADMIN_TOKEN`: For protected clinical data and administrative API access.

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/salthepal/WashUSimIntelligence.git
   cd WashUSimIntelligence
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup (Wrangler)**:
   ```bash
   cd worker
   npm install
   npx wrangler dev
   ```

---

## 🚀 Deployment

The system uses GitHub Actions for continuous delivery:

- **Frontend**: Automatically deployed via **Cloudflare Pages** and served at `https://intel.wuemsim.org`.
- **Backend**: Update resource IDs in `worker/wrangler.toml` and run `npm run deploy` in the `worker/` directory.
- **Proxying**: Production `/api/*` traffic flows through the Pages Function service binding `WASHU_SIM_INTEL_API`. Use an explicit `BACKEND_URL` only for local or break-glass testing.
- **Access**: Cloudflare Access protects `intel.wuemsim.org`, `washusimintelligence.pages.dev`, and Pages preview hostnames for `wustl.edu` users plus the configured admin email.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for resource bindings, secrets, migrations, and deployment checks.

---

## 📦 Releases

Release notes and version history are available in [GitHub Releases](https://github.com/salthepal/WashUSimIntelligence/releases) and [CHANGELOG.md](./CHANGELOG.md).

---

## 🔒 Security & Governance

- **Just Culture**: Reports prioritize growth and systemic fixes over individual blame.
- **Data Residency**: Current production placement is Cloudflare D1 in `ENAM` and R2 in `WNAM`. Treat that as approved only for non-PHI simulation safety data; migrate to newly created jurisdiction-pinned resources before accepting stricter residency requirements.
- **Administrative Access**: Clinical data reads and writes require `X-Admin-Token`.
- **Spam Protection**: Upload and generation endpoints are protected by **Cloudflare Turnstile**.
- **Security Headers**: Browser protections are served from `public/_headers`.
- **Clinical Data Handling**: Avoid entering patient identifiers or protected health information unless your Cloudflare deployment has been approved for that use.

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. See [LICENSE.md](./LICENSE.md) for full details.

---

<p align="center">
  © 2026 Washington University School of Medicine. Emergency Medicine Simulation.
</p>
