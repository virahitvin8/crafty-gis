# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS (Common Vulnerability Scoring System) assessment:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of CRAFTY GIS seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@craftygis.dev** (or to the project maintainer's email).

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

To help us understand and resolve the issue quickly, please include:

- **Type of issue** (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- **Full paths of source file(s)** related to the manifestation of the issue
- **The location of the affected source code** (tag/branch/commit or direct URL)
- **Any special configuration** required to reproduce the issue
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the issue**, including how an attacker might exploit it

### What to Expect

1. **Acknowledgement**: We'll acknowledge receipt of your vulnerability report within 48 hours
2. **Assessment**: Our team will assess the report and determine its impact and severity
3. **Fix Development**: We'll develop a fix based on severity
4. **Release**: A security patch will be released according to the timeline below
5. **Disclosure**: We'll coordinate with you on the public disclosure timeline

### Disclosure Timeline

| Severity | Response Time | Patch Timeline |
|----------|--------------|----------------|
| Critical | < 24 hours   | < 7 days       |
| High     | < 48 hours   | < 14 days      |
| Medium   | < 72 hours   | < 30 days      |
| Low      | < 1 week     | Next release   |

## Security Best Practices for Users

### Local AI (Ollama)
CRAFTY GIS runs AI models locally via Ollama by default. This means:
- **Your data never leaves your machine**
- No API keys needed for AI features
- Fully private geospatial analysis

### API & Network Security
- By default, the backend binds to `127.0.0.1` (localhost only)
- For production deployment, use environment variables for configuration
- Never expose the debug/development server to the internet
- Use HTTPS in production
- Set strong database passwords

### Data Storage
- Downloaded satellite data is stored locally in `data/downloads/`
- Generated outputs are stored in `data/outputs/`
- Ensure these directories have appropriate file permissions
- Regularly clean up unused data

## Known Security Considerations

1. **Local LLM**: The Ollama integration runs models locally. Model files can be large (4-70GB). Ensure sufficient disk space.
2. **Data Downloads**: The data downloader accesses external APIs. Be mindful of API rate limits and terms of service.
3. **User Uploads**: User-uploaded files are stored in `data/uploads/`. Validate file types in production deployments.

## Bug Bounty

At this stage, we do not operate a paid bug bounty program. However, we will publicly acknowledge security researchers who responsibly disclose vulnerabilities (with permission).

## Contact

For security-related communications: **security@craftygis.dev**

---

**Thank you for helping keep CRAFTY GIS and our community safe!** 🛡️
