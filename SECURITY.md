# Security Policy

## Reporting a Vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

Use [GitHub Private Security Advisories](https://github.com/Ranaco/hermit/security/advisories/new) to report vulnerabilities privately. This lets us coordinate a fix before public disclosure.

Include in your report:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected versions or components
- Any suggested mitigations (optional)

## Response Timeline

| Milestone | Target |
|-----------|--------|
| Acknowledgement | 48 hours |
| Triage and severity assessment | 7 days |
| Fix or mitigation plan communicated | 14 days |
| Public disclosure (coordinated) | After fix is released |

## Scope

### In Scope

- **API** (`apps/api`) — authentication, authorization, secret storage endpoints
- **CLI** (`apps/cli`) — credential handling, config file storage, token management
- **vault-client** (`packages/vault-client`) — Vault token handling, transit encryption

### Out of Scope

- Self-hosted infrastructure configuration (nginx, Docker, VPS hardening)
- Third-party dependencies (report upstream to the dependency maintainer)
- Vulnerabilities requiring physical access to the host machine
- Social engineering

## Supported Versions

Security fixes are applied to the latest released version only. We strongly recommend keeping up to date.

## Disclosure Policy

We follow coordinated disclosure. We will credit researchers in the release notes unless they prefer to remain anonymous.
