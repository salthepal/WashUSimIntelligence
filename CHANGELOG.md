# Changelog

All notable changes to WUEM Sim Intel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.9.0] - 2026-07-14

### 🧠 Flexible AI & Clinical Workspace Refresh
A feature release that makes report generation provider-flexible, adds richer case context, modernizes the interface, and hardens the production delivery path.

### ✨ Added
- **Provider-Agnostic AI Backend**: Report generation and LST extraction can use OpenAI or Gemini through a shared provider layer, with clearer configuration and fallback behavior.
- **Case Summaries in Report Drafting**: Selected case files now contribute concise summaries to report prompts, improving scenario-specific context while controlling prompt size.
- **Shared Dark Mode**: Added a manually controlled theme that persists across the WUEM Simulation suite.
- **Loading and Recovery States**: Added a clear initial data-loading experience and improved recovery when an administrator token expires or becomes invalid.
- **Automated Dependency Maintenance**: Added Dependabot configuration and guarded auto-merge automation for safe dependency updates.

### 🛠️ Changed
- **Clinical-Editorial Redesign**: Refreshed the dashboard, navigation, report workflows, notifications, and visual system to match the broader WUEM Simulation suite.
- **Cloudflare Architecture**: Routed production API traffic through the Pages Function service binding and tightened Worker deployment configuration.
- **Data Loading and Exports**: Improved database hydration behavior and lazy-loaded large export libraries to reduce initial application work.
- **Documentation and CI**: Expanded deployment, security, and architecture guidance and added continuous integration checks.

### 🐛 Fixed
- **Worker Deployment**: Repaired the backend deployment workflow and removed stale generated Wrangler artifacts from version control.
- **Backend Routing**: Corrected production API routing and strengthened error handling around the Cloudflare service boundary.
- **Backup Restore Reliability**: Batched restore writes and hardened database operations for larger datasets.
- **Security and Dependencies**: Addressed audit findings and updated vulnerable Hono, React Router, Vitest, and related dependencies.

## [3.8.1] - 2026-05-01

### 🧾 Report Export & Photo Collage Stability
A patch release focused on making session photo upload, preview, and exported report formatting reliable and polished.

### 🐛 Fixed
- **Session Photo Upload Pairing**: Added per-file client IDs to multipart uploads so each uploaded image maps back to the correct local preview and report URL.
- **Upload Response Compatibility**: The frontend now handles both legacy single-file upload responses and newer batch upload responses.
- **Duplicate Photo Output**: Fixed cases where DOCX exports could embed the same session photo multiple times after batch uploads.
- **DOCX Photo Collage Layout**: Reworked session photo export into a justified, no-crop collage that preserves full photo content while reducing unused whitespace.
- **DOCX Inline Formatting**: Bullet and numbered list items now render inline Markdown, so labels like `**Transfer Logistics:**` become proper bold text instead of literal asterisks.
- **Preview Cleanup**: Improved blob URL lifecycle handling so failed uploads do not leave broken preview cards behind.

### 🛡️ Changed
- **Worker Upload Contract**: `/upload-file` now returns optional `clientId` metadata for each uploaded file while preserving backward-compatible `url`, `urls`, and `files` response shapes.

## [3.4.0] - 2026-04-07

### 🧠 Hybrid Intelligent Search & Vector Intelligence
A milestone update introducing conceptual discovery through Vector Search, transforming the simulation library from a keyword repository into an intelligent safety knowledge base.

### ✨ Added
- **Hybrid Search Engine**: Merged **FTS5 Full-Text Search** and **Cloudflare Vectorize** into a unified "Intelligent Search" experience that combines exact keyword matches with semantic similarity.
- **Automated AI Indexing**: Seamless background vectorization of all generated and uploaded reports using **Cloudflare Workers AI** (`bge-small-en-v1.5`).
- **Semantic Similarity Scoring**: New UI indicators showing the conceptual match percentage for search results.
- **Administrative Re-indexing**: High-concurrency administrative tool to batch process existing document libraries into the AI vector store.
- **Hybrid Result Visualization**: Differentiated search results with color-coded "Keyword" and "Conceptual" markers for clear source attribution.

### 🛡️ Changed
- **Search UI**: Simplified the Document Repository by removing the manual AI toggle in favor of an always-on, unified search bar.
- **API Architecture**: Deprecated `/search/semantic` in favor of a single, high-performance `/search` endpoint that executes parallel keyword and vector queries.
- **Worker Durability**: Optimized the Gemini report generation stream and re-indexing logic with robust batching and error-casting for improved stability.

### 🐛 Fixed
- **Deployment Resilience**: Resolved TypeScript `unknown` type errors in `worker/src/index.ts` and `upload-reports.tsx` that previously blocked production CI/CD.
- **Lockfile Synchronization**: Reconciled `package-lock.json` and `package.json` mismatches to resolve Cloudflare Pages `EUSAGE` deployment failures.
- **AI Response Parsing**: Updated the Workers AI output handler to support diverse JSON response formats from the embedding model.
- **GEMINI Search Highlights**: Restored and improved title and snippet highlighting for keyword matches within the unified search results.

## [3.2.0] - 2026-04-05

### 🛡️ Platform Hardening & Institutional Branding
A significant update focused on enterprise-grade performance, auditability, and standardization with official Washington University (WashU) brand guidelines.

### ✨ Added
- **Automated LST Audit History**: Implemented database-level triggers to track all status and severity changes for Latent Safety Threats.
- **Audit Trail UI**: New history visualization component allowing users to view the full lifecycle of any safety threat.
- **Contextual Search Snippets**: Rebuilt the search engine with FTS5 highlighting, providing real-time snippets in the document repository.
- **Atomic Hydration API**: Consolidated core data retrieval into a single `/hydrate` endpoint, reducing initial load latency by ~60%.
- **WashU Brand Palette**: Integrated official #A51417 (Red) and #007A33 (Green) across all UI components and charts.

### 🛠️ Changed
- **Navigation Architecture**: Refactored the application with `React.lazy` and `Suspense` for optimized initial bundle delivery.
- **IDE Resilience**: Configured project-level workspace settings to suppress Tailwind v4 validation false-positives.
- **Deployment Workflow**: Standardized the GitHub Actions CI/CD trigger and updated documentation for Cloudflare Pages migration.

### 🐛 Fixed
- **UI Consistency**: Eliminated hardcoded utility colors in favor of theme-aware design tokens.
- **Search Logic**: Corrected prefix matching in FTS5 queries to handle complex medical terminology more accurately.

## [3.1.0] - 2026-04-03

### 🏛️ Production Stability & Optimization
Final production-grade optimizations, strictly aligning the platform with the Washington University Department of Emergency Medicine’s professional standards and "Just Culture" framework.

### ✨ Added
- **Official Simulation Prompt**: Integrated the department's official high-fidelity simulation prompt, enforcing strict Markdown and standard safety definitions (In-Situ, LST, BPS).
- **Core UI Cleanup**: Removed the "System Safety Index", "Quick Actions Bar", and redundant "System Information" for a focused clinical interface.
- **Unified Security**: Full consolidation of all Dependabot security patches and development branches into the production core.
- **Version 3.1.0 Stack**: Synchronized frontend and backend packages to the latest stable versioning.

### 🛠️ Changed
- **Dashboard**: Shifted focus to direct LST tracking and activity metrics, eliminating the calculated "Safety Index" in favor of absolute clinical data.
- **Settings**: Streamlined the settings page to focus on data management and AI configuration.

### 🐛 Fixed
- **D1 Database**: Resolved `D1_TYPE_ERROR` undefined bindings across all API routes for prior reports and case files.
- **Data Integrity**: Implemented relational table migration for case-files for improved data consistency.
- **System Limits**: Automated stripping of base64 images from case files to prevent `SQLITE_TOOBIG` storage limits.
- **API Parsing**: Corrected array response parsing for the unified case files library.
- **CI/CD**: Optimized CodeQL security workflows for pushes and fork pull requests.

---

## [2.1.0] - 2026-04-03
Three high-impact architectural upgrades for a fast, searchable, and responsive clinical simulation platform.

### ✨ Added
- **AI Streaming Support**: Shifted report generation to an asynchronous token stream for a real-time, responsive typing effect.
- **Deep Content Search (FTS5)**: Integrated an SQLite-native Full-Text Search virtual table in D1.
- **Persistence (Offline-First)**: Added `@tanstack/react-query-persist-client` for persistent browser-side caching.
- **Search Triggers**: Automated SQL triggers in D1 to keep the search index synchronized with the live `reports` table.

### 🛠️ Changed
- **API (api.ts)**: Enhanced the client layer with `AsyncGenerator` support for AI streams.
- **Repository UI**: Swapped local filtering for server-side Full-Text Search for deep repository queries.
- **Dashboard Speed**: Queries now default to a 24-hour persistence layer for sub-millisecond tab switching.

---

## [2.0.0] - 2026-04-03

### 🚀 The Cloudflare Migration (Forever Free Architecture)
A major architectural overhaul migrating from Supabase to a high-performance, cost-effective Cloudflare-native stack.

### ✨ Added
- **Cloudflare Worker Backend**: High-performance API powered by Hono.
- **D1 SQL Database**: Structured relational storage for Reports, LSTs, Session Notes, and Audit Logs.
- **R2 Object Storage**: 10GB free space for persisting actual report documents and media files.
- **KV Rate Limiter**: Protective layer for Gemini API consumption using Cloudflare Key-Value store.
- **Gemini Port**: Secure integration of AI report generation in the edge worker.
- **Enhanced Audit Logs**: Detailed tracking of all administrative events in SQL.
- **Dependabot & CodeQL**: Automated security scanning and dependency patching.

### 🛠️ Changed
- **API Architecture**: Unified all frontend calls into a centralized `api.ts` layer.
- **Storage Strategy**: Migrated from JSON-blob/KV approach to structured, queryable relational tables.
- **Security**: Moved all AI keys to Cloudflare secret management.

### 🗑️ Removed
- **Supabase Integration**: Completely removed all legacy Supabase SDKs, IDs, and keys.

---

## [1.0.0] - 2026-04-02

### 🎉 Initial Release - Comprehensive Intelligence Platform

The first production-ready release of WUEM Sim Intel with 26 major optimization features.

### ✨ Added

#### Core Features
- **AI-Powered Report Generation** - Gemini 3.0 Flash Experimental integration
- **LST Intelligence Tracking** - Comprehensive latent safety threat management
- **Style Guide Training** - Upload past reports for consistent AI output
- **7 Main Tabs** - Dashboard, Upload, Cases, Notes, Generate, LST Tracker, Repository, Settings

#### User Experience
- **Dark Mode** - Full WCAG AA compliant theme with persistence
- **Horizontal Scroll Tabs** - Optimized for bedside tablet use
- **Skeleton Loading States** - Instant UI feedback during data loading
- **Responsive Design** - Mobile, tablet, and desktop optimization
- **Interactive Tour** - Onboarding experience with react-joyride
- **Keyboard Shortcuts** - Quick access to common actions

#### Data Management
- **Advanced Filtering** - Search by tags, metadata, dates, and custom fields
- **Bulk Operations** - Multi-select for export and deletion
- **Backup & Restore** - Full data export/import capabilities
- **Audit Logging** - Complete action history tracking
- **Document Comparison** - Side-by-side view of multiple documents
- **Template Management** - Reusable templates for common report types

#### Export Capabilities
- **Copy to Clipboard** - One-click copy with formatting
- **DOCX Export** - Microsoft Word compatible downloads
- **PDF Export** - Production-ready PDF generation

#### LST Tracker Features
- **Severity Classification** - High/Medium/Low with color coding
- **Status Management** - Identified/In Progress/Resolved/Recurring
- **Location Tracking** - Department and specific location fields
- **Assignee Management** - Responsibility assignment and tracking
- **Recurrence Detection** - Identify systemic safety issues
- **Resolution Notes** - Detailed closure documentation

#### Dashboard Analytics
- **Real-Time Metrics** - Document counts, active LSTs, case files
- **Recent Activity** - Timeline of last 10 actions
- **LST Distribution** - Visual breakdown by status and severity
- **Document Trends** - Activity tracking over time
- **Quick Actions** - One-click access to common workflows

### 🛠️ Technical Improvements

#### Performance
- **Safe Parallel Loading** - Promise.allSettled for database operations
- **Debounced Search** - Reduced API calls during filtering
- **Lazy Loading** - On-demand component loading
- **Code Splitting** - Optimized bundle sizes
- **Local Storage Caching** - Theme and session state persistence

#### Backend Architecture
- **Supabase Edge Functions** - Deno/Hono web server
- **KV Store Database** - Flexible JSONB storage
- **Text Sanitization** - Input validation and security
- **Error Handling** - Comprehensive error logging
- **CORS Protection** - Secure cross-origin requests

#### Developer Experience
- **TypeScript** - Strict mode with comprehensive types
- **Vite 6.3.5** - Fast build and hot module replacement
- **React 18.3.1** - Latest React features and hooks
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives

### 🎨 Design System

#### Branding
- **WashU PMS 200** - Primary red (#A51417)
- **WashU PMS 350** - Accent green (#007A33)
- **WCAG AA Compliance** - Accessible color contrast ratios
- **Consistent Typography** - Professional medical documentation style

#### Components
- 40+ UI Components from Radix UI
- Custom components for domain-specific functionality
- Consistent spacing and layout patterns
- Smooth animations and transitions

### 🔐 Security

- API keys stored securely in Supabase environment variables
- Private storage buckets with signed URLs
- Service role key isolated to backend only
- Input sanitization on all user-submitted data
- Comprehensive audit logging for compliance

### 📦 Deployment

- **GitHub Pages** - Configured with `/washusimintelligence/` base path
- **Automated Workflows** - CI/CD ready with GitHub Actions
- **Manual Deployment** - gh-pages support for one-time deploys
- **Health Check** - Included health-check.html for monitoring

### 🐛 Fixed

- Database connection errors with parallel data loading
- Dark mode inconsistencies across components
- Route handling for GitHub Pages deployment
- Export formatting issues in DOCX and PDF
- LST tracker edit state management
- Session note metadata validation

### 📚 Documentation

- Comprehensive README.md with setup instructions
- CONTRIBUTING.md for development guidelines
- DEPLOYMENT.md for GitHub Pages deployment
- CHANGELOG.md for version tracking
- Inline JSDoc comments for complex functions

### 🔄 Changed from Previous Iterations

- Simplified from 11 tabs to 7 main tabs for clarity
- Consolidated repository and settings into dedicated tabs
- Removed redundant features and streamlined workflows
- Improved AI prompt engineering for better report quality
- Enhanced mobile responsiveness for clinical bedside use

### ⚠️ Known Limitations

- Database migrations must be handled via Supabase UI
- KV Store not optimized for complex relational queries
- Email server configuration required for production auth
- Large batch operations (500+) may require pagination
- PDF export may need post-processing for complex formatting

### 🎯 Future Roadmap

#### Planned for v1.1.0
- Enhanced template system with conditional logic
- Advanced LST analytics and reporting
- Integration with external EMR systems
- Multi-user collaboration features
- Real-time document editing

#### Under Consideration
- Offline mode for disconnected environments
- Voice-to-text for session notes
- AI-powered LST recommendation engine
- Mobile native apps (iOS/Android)
- Integration with simulation equipment

---

## Version History

### Versioning Strategy

- **Major (X.0.0)** - Breaking changes, major feature additions
- **Minor (1.X.0)** - New features, non-breaking changes
- **Patch (1.0.X)** - Bug fixes, minor improvements

### Release Schedule

- **Major releases**: Quarterly or as needed for significant features
- **Minor releases**: Monthly or as features are completed
- **Patch releases**: As needed for critical bug fixes

---

## How to Use This Changelog

This changelog is maintained to help:

- **Users** - Understand what's new and changed
- **Developers** - Track feature development and bug fixes
- **Stakeholders** - Monitor progress and plan upgrades

### Categories

- **Added** - New features and capabilities
- **Changed** - Changes to existing functionality
- **Deprecated** - Features marked for removal
- **Removed** - Features removed in this release
- **Fixed** - Bug fixes and corrections
- **Security** - Security improvements and patches

---

**Note**: This is the initial release (1.0.0) marking the transition from development to production. All features have been thoroughly tested for clinical use in the WUEM simulation environment.

For detailed feature documentation, see [README.md](./README.md).  
For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).  
For contributing guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
