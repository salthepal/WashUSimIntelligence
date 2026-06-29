# Security Policy

## Supported Versions

Only the latest release of **WashU Sim Intelligence** is supported for security updates. We recommend all users keep their deployments up to date with the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| v3.2.0+ | :white_check_mark: |
| < v3.2.0 | :x:                |

## Reporting a Vulnerability

We take the security of this platform and its clinical data seriously. If you find a security vulnerability, please do **not** open a public GitHub issue. Instead, report it privately to our security team.

### Preferred Method
Please use the following email address for all security-related reports:
**sim-security@wustl.edu**

### What to Include
When reporting a vulnerability, please include:
- A brief description of the issue.
- Steps to reproduce (or a proof-of-concept).
- The potential impact of the vulnerability.
- Any suggested mitigations.

### Our Response
We will acknowledge your report within **48 hours** and provide an estimated timeline for a fix. We ask that you follow **Responsible Disclosure**—please do not share the vulnerability publicly until we have had a chance to remediate it.

---

## 🔒 Platform Security Features

WashU Sim Intelligence leverages several Cloudflare security primitives:
- **XSS Protection**: Inputs are sanitized via **DOMPurify** before rendering.
- **Administrative Access**: Clinical data endpoints require a configured admin token.
- **CSRF/Abuse Protection**: Sensitive write endpoints require custom headers and upload/generation routes require **Cloudflare Turnstile**.
- **D1/R2 Isolation**: Minimal database permissions and authenticated access for assets.
- **Clinical Data Handling**: Do not enter patient identifiers or protected health information unless your deployment has completed institutional privacy and access-control review.
- **Data Residency**: The current production D1 database runs in Cloudflare `ENAM`, and the R2 bucket is located in `WNAM`. Treat this placement as the approved operating region for non-PHI simulation safety data; migrate to newly created jurisdiction-pinned resources before accepting data with stricter residency requirements.

---

**Built for Clinical Safety, Powered by Intelligence.**  
© 2026 Washington University School of Medicine.
