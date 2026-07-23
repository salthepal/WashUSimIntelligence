# Documentation Index

Welcome to the WUEM Sim Intel documentation. This index will help you find the information you need.

## 📚 Core Documentation

### Getting Started
- **[README.md](../README.md)** - Main project documentation, installation, and usage guide
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Comprehensive Cloudflare deployment guide
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Guidelines for contributing to the project
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes

### Legal & Security
- **[LICENSE.md](../LICENSE.md)** - GNU General Public License v3.0 terms
- **[SECURITY.md](../SECURITY.md)** - Security policy and vulnerability reporting

## 🚀 Quick Links

### For Users
- [Installation Guide](../README.md#getting-started)
- [System Architecture](../README.md#system-architecture)

### For Developers
- [Development Setup](../CONTRIBUTING.md#development-environment)
- [Branching Strategy](../CONTRIBUTING.md#branching--versioning)
- [Testing Protocol](../CONTRIBUTING.md#testing-protocol)
- [Pull Request Process](../CONTRIBUTING.md#contribution-guidelines)

### For DevOps
- [Frontend Deployment (Cloudflare Pages)](../DEPLOYMENT.md#1-frontend-deployment-cloudflare-pages)
- [Backend Deployment (Cloudflare Workers)](../DEPLOYMENT.md#2-backend-deployment-cloudflare-workers)
- [Environment Variables & Secrets](../DEPLOYMENT.md#3-environment-variables--secrets)

## 🎯 Feature Documentation

### Core Features

#### 1. AI-Powered Report Generation
Generate professional post-session reports using Google Gemini Flash.

**Key capabilities:**
- Style guide training from past reports
- Multi-document synthesis
- Editable generated content
- Three export formats (Copy, DOCX, PDF)

**Location:** Generate tab

#### 2. Latent Safety Threat (LST) Tracking
Comprehensive system for identifying, managing, and resolving safety threats.

**Key capabilities:**
- Severity classification (High/Medium/Low)
- Status tracking (Identified/In Progress/Resolved/Recurring)
- Location and assignee management
- Recurrence detection
- Resolution notes

**Location:** LST Tracker tab

#### 3. Dashboard Analytics
Real-time metrics and insights into documentation and safety trends.

**Key metrics:**
- Total documents and cases
- Active LST count
- Recent activity timeline
- LST distribution by status and severity
- Document trend analysis

**Location:** Dashboard tab (default)

#### 4. Document Repository
Centralized storage and management for all generated reports.

**Key capabilities:**
- Advanced search and filtering
- Tag-based organization
- Bulk operations
- Document comparison view

**Location:** Repository tab

#### 5. Style Guide Upload
Train the AI by uploading past reports as examples.

**Supported formats:**
- PDF documents
- DOCX (Microsoft Word) documents
- Text extraction and analysis

**Location:** Upload tab

#### 6. Session Notes Management
Document simulation sessions with rich metadata.

**Key fields:**
- Date and time
- Facilitator information
- Participant details
- Observation notes
- Debriefing comments

**Location:** Session Notes tab

#### 7. Case File Management
Store simulation case information for reference.

**Key fields:**
- Case name and description
- Location and equipment
- Participant roles
- Scenario details

**Location:** Cases tab

## 🛠️ Technical Documentation

### Architecture

#### Frontend Stack
- **Framework:** React 18.3.1 with TypeScript
- **Styling:** Tailwind CSS v4 + Radix UI
- **Routing:** React Router
- **Build Tool:** Vite 6.4.2
- **State Management:** TanStack React Query

#### Backend Stack
- **Platform:** Cloudflare Workers
- **Runtime:** Node.js-compatible (V8 isolates)
- **Web Server:** Hono
- **Database:** Cloudflare D1 (SQLite with FTS5)
- **Object Storage:** Cloudflare R2
- **Metadata Cache:** Cloudflare KV (rate limiting & auth)
- **Vector Search:** Cloudflare Vectorize + Workers AI
- **AI Search:** Custom RAG (Vectorize + Workers AI)
- **Generative AI:** Google Gemini Flash

#### Key Technologies
- **Document Processing:** docx, jsPDF, mammoth
- **Charts:** Recharts
- **Forms:** React Hook Form
- **UI Components:** Radix UI primitives

### Project Structure

```
washusimintelligence/
├── .github/
│   ├── workflows/
│   │   ├── deploy-worker.yml    # Cloudflare Worker CI/CD
│   │   └── release-please.yml  # Automated semantic releases
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   └── feature_request.yml
│   ├── CODE_OF_CONDUCT.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── src/
│   ├── app/
│   │   ├── components/          # React components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   ├── dashboard.tsx
│   │   │   ├── generate-report.tsx
│   │   │   ├── lst-tracker.tsx
│   │   │   └── ...
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # API client, sanitization, document utilities
│   │   ├── api.ts              # Unified API layer
│   │   ├── types.ts            # TypeScript type definitions
│   │   └── App.tsx             # Main application
│   ├── styles/                 # CSS files
│   │   ├── index.css
│   │   ├── theme.css           # Theme variables
│   │   └── fonts.css
│   └── main.tsx               # Vite entry point
├── worker/
│   ├── src/
│   │   ├── index.ts            # Hono entry point
│   │   ├── types.ts            # Backend types
│   │   ├── routes/             # Shared route modules
│   │   ├── utils/              # AI integration, Gemini caching
│   │   └── lib/                # Helpers (vectorization, auditing, rate limiting)
│   ├── schema.sql              # D1 database schema
│   ├── fts_setup.sql           # Full-text search setup
│   ├── wrangler.toml           # Cloudflare bindings (D1, R2, KV, Vectorize, AI)
│   └── package.json
├── functions/
│   └── api/[[path]].ts         # Cloudflare Pages proxy to Worker
├── docs/                       # Documentation
├── public/                     # Static assets
├── CHANGELOG.md
├── CONTRIBUTING.md
├── DEPLOYMENT.md
├── LICENSE.md
├── README.md
├── package.json
└── vite.config.ts
```

### Configuration Files

- **vite.config.ts** - Vite build configuration
- **worker/wrangler.toml** - Cloudflare Worker bindings and deployment config
- **package.json** - Frontend dependencies and npm scripts
- **.gitignore** - Excludes node_modules, dist, .wrangler, .dev.vars, secrets

## 🔧 Development Guides

### Setting Up Development Environment

1. **Prerequisites**
   - Node.js 20+
   - Git
   - Cloudflare account (D1, R2, Vectorize, KV, AI Search)
   - Google Gemini API key
   - Wrangler CLI (`npm install -g wrangler`)

2. **Frontend Setup**
   ```bash
   git clone https://github.com/salthepal/WashUSimIntelligence.git
   cd WashUSimIntelligence
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd worker
   npm install
   npx wrangler dev
   ```

### Common Development Tasks

#### Adding a New Component
```typescript
// src/app/components/my-component.tsx
import React from 'react';

export function MyComponent() {
  return <div>Component content</div>;
}
```

#### Adding a New API Route
Add a new route file under `worker/src/routes/` and register it in `worker/src/index.ts`.

#### Styling Components
Use Tailwind utility classes and theme variables from `/src/styles/theme.css`.

#### Accessing the Database
Use the D1 binding available on the Hono context (`c.env.DB`) within worker route handlers.

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (must be 20+)
- Verify all dependencies are installed in both root and `worker/`

#### API Connection Issues
- Confirm the Worker is running: `cd worker && npx wrangler dev`
- Check Cloudflare binding IDs in `worker/wrangler.toml`
- Confirm Cloudflare Pages has `BACKEND_URL` set to the deployed Worker URL
- Verify secrets are set: `npx wrangler secret list`

#### Dark Mode Issues
- Check theme provider wraps entire app
- Verify dark mode classes in Tailwind config
- Test theme toggle functionality

#### Deployment Issues
- Ensure Wrangler is authenticated: `npx wrangler login`
- Verify D1 database ID matches `wrangler.toml`
- Review Cloudflare Pages build logs

### Getting Help

- **GitHub Issues:** [Report bugs or request features](https://github.com/salthepal/WashUSimIntelligence/issues)
- **Development Team:** Contact WashU EM for technical support

## 📊 Performance Optimization

### Best Practices

1. **Code Splitting**
   - Lazy load route components
   - Use dynamic imports for large dependencies

2. **Asset Optimization**
   - Compress images before upload (WebP preferred)
   - Minimize SVG files

3. **Database Queries**
   - Use D1 prepared statements for repeated queries
   - Implement pagination for large datasets
   - Leverage FTS5 indexes for full-text search

4. **Bundle Size**
   - Analyze bundle with `npm run build`
   - Remove unused dependencies
   - Tree-shake libraries where possible

## 🔒 Security Best Practices

### Frontend Security
- Never expose API keys or secrets in client-side code
- Sanitize all user input (DOMPurify is pre-configured)
- Use HTTPS for all API calls
- Implement proper CORS policies

### Backend Security
- Secrets managed via `npx wrangler secret put`
- Clinical data endpoints require `X-Admin-Token`
- Validate all incoming requests with Zod schemas
- Use parameterized D1 queries to prevent SQL injection
- Log security-relevant events to the audit_logs table

### Data Privacy
- De-identify patient data before entry
- Follow HIPAA compliance guidelines
- Regular security audits
- Base64 image data stripped before SQL persistence
- Avoid entering patient identifiers or protected health information unless the deployment is approved for that data

## 📝 Maintenance

### Regular Tasks

#### Weekly
- Review and triage new issues
- Monitor performance metrics
- Check for security updates

#### Monthly
- Update dependencies (Dependabot PRs)
- Review audit logs
- Backup D1 database

#### Quarterly
- Major version updates
- Performance optimization review
- Documentation updates
- User feedback collection

## 🎓 Training Resources

### For End Users
- Keyboard shortcuts reference (see README)
- User manual sections in README

### For Developers
- Contributing guidelines (CONTRIBUTING.md)
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Hono docs: https://hono.dev/
- Wrangler CLI reference: https://developers.cloudflare.com/workers/wrangler/

## 📞 Contact & Support

### Support Channels
- **Technical Issues:** GitHub Issues
- **Feature Requests:** GitHub Discussions
- **Security Concerns:** See [SECURITY.md](../SECURITY.md)
- **General Questions:** WashU EM development team

---

**Last Updated:** April 27, 2026  
**Project Version:** 3.8.0

For the most up-to-date information, always refer to the [README.md](../README.md) and [CHANGELOG.md](../CHANGELOG.md).
