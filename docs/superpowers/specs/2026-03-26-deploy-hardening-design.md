# Deployment Hardening — Design Spec

**Date:** 2026-03-26
**Scope:** `.github/workflows/deploy.yml`, `.github/workflows/release.yml`, `apps/api/Dockerfile`, `docker-compose.deploy.yml`, `deploy.sh`
**Goal:** Fix reliability, security, and correctness issues in the CI/CD pipeline to make deployments production-safe.

---

## Background

A full audit of the deployment system identified 8 issues across the GitHub Actions workflows, Dockerfile, Compose stack, and bootstrap script. No architectural changes are required. All fixes are surgical and confined to the files where the issue originates.

---

## Issue Catalogue

### Critical

#### D1 · Deploy concurrency can kill a running deployment mid-flight
- **File:** `.github/workflows/deploy.yml:11`
- **Issue:** `cancel-in-progress: true` means a second commit pushed while a deploy is running will cancel the first job immediately — potentially mid-migration or mid-container-swap, leaving the stack in a broken state.
- **Fix:** Change to `cancel-in-progress: false`. In-flight deploys run to completion; the next queued run starts after.

#### D2 · Double Prisma migration on every deploy
- **File:** `apps/api/Dockerfile:74` and `.github/workflows/deploy.yml:303`
- **Issue:** The Dockerfile CMD runs `npx prisma migrate deploy` before starting the server. The deploy workflow also runs `prisma migrate deploy` over SSH after the container passes its health check. Every deploy triggers two migration attempts. Container restarts outside a deploy also trigger an unintended migration.
- **Fix:** Remove migration from Dockerfile CMD. CMD becomes `["node", "dist/index.cjs"]` using the exec form so SIGTERM reaches the Node process directly. Migration remains exclusively in the deploy workflow, which already gates it behind the container health check.

#### D3 · Health check uses `curl -k` (insecure TLS skip)
- **File:** `.github/workflows/deploy.yml:325`
- **Issue:** `curl -kfsS https://127.0.0.1/health` disables TLS certificate verification. The cert is issued for the domain, not `127.0.0.1`, so `-k` is required — but this means TLS is not actually validated.
- **Fix:** Change to `curl -fsS http://127.0.0.1/health`. nginx already listens on port 80 internally; no TLS is needed for an intra-VPS health check.

### High

#### D4 · Node version mismatch between CI and release workflows
- **File:** `.github/workflows/release.yml:24,69`
- **Issue:** Both the `release` and `build-binaries` jobs use `node-version: 18` while CI uses `node-version: 20`. Packages are tested on Node 20 but published and bundled on Node 18.
- **Fix:** Change both jobs to `node-version: 20`. The `pkg_target: node18-*` matrix entries are unchanged — they control the Node runtime bundled into the binary, not the build toolchain. Binaries remain compatible with Node 18 runtimes.

#### D5 · `github.token` passed as inline script substitution in SSH step
- **File:** `.github/workflows/deploy.yml:224`
- **Issue:** `echo "${{ github.token }}" | docker login ghcr.io ...` bakes the token value directly into the script text before it is sent over SSH. The other variables in the same script (`API_CHANGED`, `WEB_CHANGED`, etc.) are passed cleanly via `envs:`.
- **Fix:** Add `GHCR_TOKEN: ${{ github.token }}` to the step's `env:` block and reference `$GHCR_TOKEN` in the script body. Consistent with how all other dynamic values are passed in that step.

### Medium

#### D6 · `certbot` service has no network definition
- **File:** `docker-compose.deploy.yml:118`
- **Issue:** Every other service is on the `hermit` bridge network. `certbot` has no `networks:` entry, so it runs on Docker's default bridge and cannot reach nginx. The `certbot renew` loop will fail to serve ACME challenges through nginx.
- **Fix:** Add `networks: - hermit` to the certbot service.

#### D7 · `sleep 3` before certbot in bootstrap script
- **File:** `deploy.sh:182`
- **Issue:** After `docker compose up -d nginx`, a fixed 3-second sleep is used before running certbot. If nginx hasn't finished binding port 80, the ACME challenge fails.
- **Fix:** Replace `sleep 3` with a poll loop: attempt `curl -fsS http://127.0.0.1/` up to 10 times with 2-second gaps. Proceed as soon as nginx responds (any HTTP response counts — a redirect or 404 is fine).

#### D8 · One-shot health check at end of bootstrap
- **File:** `deploy.sh:235`
- **Issue:** `curl -fsS "http://127.0.0.1/health"` is a single attempt. If services are still settling after `docker compose up`, the bootstrap fails even though the stack would be healthy moments later.
- **Fix:** Replace with a retry loop: up to 12 attempts with 5-second gaps, matching the pattern already used in the deploy workflow's HTTPS health check.

---

## Implementation Plan

All changes are in a single pass — they are independent of each other and can be applied in any order.

### Files to edit

| File | Changes |
|------|---------|
| `.github/workflows/deploy.yml` | D1 (concurrency), D3 (health check URL), D5 (GHCR_TOKEN env var) |
| `.github/workflows/release.yml` | D4 (node-version 18 → 20) |
| `apps/api/Dockerfile` | D2 (remove migration from CMD) |
| `docker-compose.deploy.yml` | D6 (certbot network) |
| `deploy.sh` | D7 (nginx poll), D8 (health check retry) |

---

## What Is Not Changing

- No changes to the CI workflow (`ci.yml`) — it is correct.
- No changes to `pkg_target` values — binary runtime targets stay at `node18-*`.
- No changes to the Vault bootstrap flow, nginx config, or Compose service topology.
- No new npm dependencies, no new GitHub Actions, no new secrets required.

---

## Success Criteria

- A deploy triggered while another is running waits in queue rather than cancelling the in-flight deploy.
- `prisma migrate deploy` runs exactly once per deploy, after the container is healthy.
- The deploy workflow health check hits port 80 over HTTP with no TLS flags.
- CI and release workflows both run on Node 20.
- `GHCR_TOKEN` is passed as an environment variable, not inline script substitution.
- certbot is on the `hermit` network and can renew certificates without manual intervention.
- Bootstrap script polls nginx readiness before running certbot.
- Bootstrap health check retries up to 60 seconds before failing.
