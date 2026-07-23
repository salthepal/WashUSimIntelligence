# Contributing to WUEM Sim Intel

Thank you for your interest in contributing to **WUEM Sim Intel**. This project is a Cloudflare-native platform for high-fidelity clinical simulation tracking.

## 🎯 Our Mission

To provide a high-concurrency intelligence layer for simulation programs, focusing on psychological safety (**Just Culture**) and actionable latent safety threat (LST) synthesis.

## 🚀 Development Environment

### 1. Prerequisites
- **Node.js**: v20 or higher.
- **Cloudflare Account**: Access to D1, R2, and KV namespaces.
- **Wrangler CLI**: `npm install -g wrangler`.
- **Git**: Configured for your GitHub account.

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/salthepal/WashUSimIntelligence.git
cd WashUSimIntelligence

# Install Root Dependencies (Frontend)
npm install

# Install Worker Dependencies (Backend)
cd worker
npm install
```

### 3. Running Locally
- **Frontend**: `npm run dev` (Vite)
- **Backend**: `cd worker && npx wrangler dev`

---

## 🛠️ Branching & Versioning

### Conventional Commits
We use **Conventional Commits** to automate our versioning and changelog generation. All PRs must follow this format:

| Type | Description | Resulting Version |
| :--- | :--- | :--- |
| `feat:` | New features | Minor (3.3.0) |
| `fix:` | Bug fixes | Patch (3.2.1) |
| `feat!:` | Breaking changes | Major (4.0.0) |
| `chore:` | Internal maintenance | No bump |

---

## 📝 Contribution Guidelines

### Branching Strategy
- `feat/`: New clinical features or AI prompts.
- `fix/`: Stability improvements or database edge cases.
- `docs/`: Documentation refinements.
- `refactor/`: Architectural transitions.

### Standards & Quality
- **TypeScript**: No `implicit-any`. Ensure API responses are strictly typed.
- **UI/UX**: Strictly follow the simulation design language. Ensure dark mode parity and hospital tablet responsiveness.
- **Security**: Never commit secrets. Use `npx wrangler secret put` for Gemini keys and tokens.
- **Verification**: Run `npm run build` locally before submitting a PR.

---

## 🧪 Testing Protocol

- **Build Validation**: Ensure the build succeeds in the root and `worker/`.
- **Edge Testing**: Verify that AI streaming works without interruption.
- **Schema Validation**: Ensure D1 triggers correctly synchronize the FTS5 search index.

---

## 📄 License & Governance

By contributing, you agree that your contributions will be licensed under the **GNU General Public License v3.0 (GPLv3)**.

**Built for Clinical Safety, Powered by Intelligence.**  
© 2026 Washington University Simulation Intelligence Team
