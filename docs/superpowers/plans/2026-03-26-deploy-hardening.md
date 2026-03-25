# Deployment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 correctness, reliability, and security issues across the CI/CD pipeline without changing any deployment architecture.

**Architecture:** Surgical single-file edits only. No new files, no new dependencies, no new secrets. Each task is independent and can be applied in any order.

**Tech Stack:** GitHub Actions, Docker Compose, bash, Node 20, `@yao-pkg/pkg` for CLI binaries.

---

## File Map

| File | Issues fixed |
|------|-------------|
| `.github/workflows/deploy.yml` | D1 (concurrency), D3 (health check TLS), D5 (GHCR_TOKEN env var) |
| `.github/workflows/release.yml` | D4 (Node 18 → 20) |
| `apps/api/Dockerfile` | D2 (remove migration from CMD) |
| `docker-compose.deploy.yml` | D6 (certbot network) |
| `deploy.sh` | D7 (nginx readiness poll), D8 (health check retry) |

---

## Task 1: Fix deploy.yml — concurrency, health check, GHCR token (D1, D3, D5)

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Fix D1 — change cancel-in-progress to false**

Open `.github/workflows/deploy.yml`. Find lines 10-12:
```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

Change to:
```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false
```

- [ ] **Step 2: Fix D5 — add GHCR_TOKEN to the Deploy release step env block**

Find the `Deploy release` step (around line 199). The `env:` block currently reads:
```yaml
        env:
          API_CHANGED: ${{ needs.detect-changes.outputs.api_changed }}
          WEB_CHANGED: ${{ needs.detect-changes.outputs.web_changed }}
          DOCS_CHANGED: ${{ needs.detect-changes.outputs.docs_changed }}
          DEPLOY_ASSETS_CHANGED: ${{ needs.detect-changes.outputs.deploy_assets_changed }}
```

Add `GHCR_TOKEN`:
```yaml
        env:
          API_CHANGED: ${{ needs.detect-changes.outputs.api_changed }}
          WEB_CHANGED: ${{ needs.detect-changes.outputs.web_changed }}
          DOCS_CHANGED: ${{ needs.detect-changes.outputs.docs_changed }}
          DEPLOY_ASSETS_CHANGED: ${{ needs.detect-changes.outputs.deploy_assets_changed }}
          GHCR_TOKEN: ${{ github.token }}
```

- [ ] **Step 3: Fix D5 — add GHCR_TOKEN to the envs list**

In the same step, find the `with:` block:
```yaml
          envs: API_CHANGED,WEB_CHANGED,DOCS_CHANGED,DEPLOY_ASSETS_CHANGED
```

Change to:
```yaml
          envs: API_CHANGED,WEB_CHANGED,DOCS_CHANGED,DEPLOY_ASSETS_CHANGED,GHCR_TOKEN
```

- [ ] **Step 4: Fix D5 — replace inline token substitution in script**

In the `script:` block of the Deploy release step, find:
```bash
            echo "${{ github.token }}" | docker login ghcr.io -u "${{ github.repository_owner }}" --password-stdin
```

Change to:
```bash
            echo "$GHCR_TOKEN" | docker login ghcr.io -u "${{ github.repository_owner }}" --password-stdin
```

- [ ] **Step 5: Fix D3 — change health check to HTTP**

In the same `script:` block, find the final health check loop (around line 325):
```bash
            until curl -kfsS https://127.0.0.1/health > /dev/null; do
```

Change to:
```bash
            until curl -fsS http://127.0.0.1/health > /dev/null; do
```

- [ ] **Step 6: Verify the three changes are present**

Run:
```bash
grep -n "cancel-in-progress" .github/workflows/deploy.yml
grep -n "GHCR_TOKEN" .github/workflows/deploy.yml
grep -n "curl" .github/workflows/deploy.yml
```

Expected output:
```
12:  cancel-in-progress: false
207:          GHCR_TOKEN: ${{ github.token }}
211:          envs: API_CHANGED,WEB_CHANGED,DOCS_CHANGED,DEPLOY_ASSETS_CHANGED,GHCR_TOKEN
224:            echo "$GHCR_TOKEN" | docker login ghcr.io -u ...
325:            until curl -fsS http://127.0.0.1/health > /dev/null; do
```

(Line numbers may vary slightly — confirm all five patterns appear.)

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "fix: harden deploy workflow — queue deploys, HTTP health check, GHCR token as env var"
```

---

## Task 2: Fix release.yml — align Node version to 20 (D4)

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Update node-version in the release job**

Open `.github/workflows/release.yml`. Find the `release` job setup-node step (around line 23):
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
          registry-url: https://registry.npmjs.org
```

Change `node-version: 18` to `node-version: 20`:
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          registry-url: https://registry.npmjs.org
```

- [ ] **Step 2: Update node-version in the build-binaries job**

Find the `build-binaries` job setup-node step (around line 68):
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
```

Change to:
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
```

Note: Do NOT change the `pkg_target: node18-*` matrix entries — those control the Node runtime bundled inside the binary, not the build toolchain.

- [ ] **Step 3: Verify no remaining node-version: 18 entries**

Run:
```bash
grep -n "node-version" .github/workflows/release.yml
```

Expected:
```
24:          node-version: 20
69:          node-version: 20
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "fix: align release workflow to Node 20 to match CI"
```

---

## Task 3: Fix Dockerfile — remove migration from CMD (D2)

**Files:**
- Modify: `apps/api/Dockerfile`

- [ ] **Step 1: Replace the CMD**

Open `apps/api/Dockerfile`. Find line 74:
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy --schema /app/packages/prisma/schema.prisma && node dist/index.cjs"]
```

Replace with:
```dockerfile
CMD ["node", "dist/index.cjs"]
```

The exec form (`["node", ...]`) ensures SIGTERM is delivered directly to the Node process for graceful shutdown, rather than being trapped by `sh`.

- [ ] **Step 2: Verify the change**

Run:
```bash
grep -n "CMD" apps/api/Dockerfile
```

Expected:
```
74:CMD ["node", "dist/index.cjs"]
```

- [ ] **Step 3: Confirm migration still runs in deploy workflow**

Run:
```bash
grep -n "prisma migrate" .github/workflows/deploy.yml
```

Expected:
```
303:              docker compose "${compose_args[@]}" exec -T api npx prisma migrate deploy --schema=/app/packages/prisma/schema.prisma
```

This confirms migration runs exactly once per deploy, after the container is healthy.

- [ ] **Step 4: Commit**

```bash
git add apps/api/Dockerfile
git commit -m "fix: remove prisma migrate from Dockerfile CMD — deploy workflow owns migration"
```

---

## Task 4: Fix docker-compose.deploy.yml — add certbot to hermit network (D6)

**Files:**
- Modify: `docker-compose.deploy.yml`

- [ ] **Step 1: Add networks to certbot service**

Open `docker-compose.deploy.yml`. Find the `certbot` service (around line 118):
```yaml
  certbot:
    image: certbot/certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

Add `networks:` after `entrypoint:`:
```yaml
  certbot:
    image: certbot/certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    networks:
      - hermit
```

- [ ] **Step 2: Verify**

Run:
```bash
grep -A 8 "certbot:" docker-compose.deploy.yml | tail -6
```

Expected output includes:
```
    networks:
      - hermit
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.deploy.yml
git commit -m "fix: add certbot to hermit network so it can reach nginx for ACME renewal"
```

---

## Task 5: Fix deploy.sh — nginx readiness poll and health check retry (D7, D8)

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Replace sleep 3 with nginx readiness poll (D7)**

Open `deploy.sh`. Find the section around line 181 where nginx is started before the certbot certificate request:
```bash
  docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d nginx
  sleep 3

  docker compose -f "$COMPOSE_FILE" --env-file .env.production run --rm \
```

Replace `sleep 3` with a poll loop:
```bash
  docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d nginx

  nginx_ready_attempts=0
  until curl -sS http://127.0.0.1/ >/dev/null 2>&1; do
    nginx_ready_attempts=$((nginx_ready_attempts + 1))
    if [ "$nginx_ready_attempts" -ge 10 ]; then
      echo "nginx did not become ready in time." >&2
      docker compose -f "$COMPOSE_FILE" --env-file .env.production logs --tail=50 nginx >&2 || true
      exit 1
    fi
    sleep 2
  done

  docker compose -f "$COMPOSE_FILE" --env-file .env.production run --rm \
```

Note: `-sS` without `-f` — nginx on port 80 will return a redirect or 404, not a 200, so `-f` would cause a false failure. `-sS` exits non-zero only on a connection error, which is what we care about.

- [ ] **Step 2: Replace one-shot health check with retry loop (D8)**

Find the final health check near the end of `deploy.sh` (around line 235):
```bash
echo "Checking health..."
curl -fsS "http://127.0.0.1/health" > /dev/null
```

Replace with:
```bash
echo "Checking health..."
health_attempts=0
until curl -fsS http://127.0.0.1/health > /dev/null; do
  health_attempts=$((health_attempts + 1))
  if [ "$health_attempts" -ge 12 ]; then
    echo "Health check did not succeed in time." >&2
    exit 1
  fi
  sleep 5
done
```

- [ ] **Step 3: Verify both changes**

Run:
```bash
grep -n "sleep 3" deploy.sh
```

Expected: no output (sleep 3 is gone).

Run:
```bash
grep -n "nginx_ready_attempts\|health_attempts" deploy.sh
```

Expected:
```
<line>:  nginx_ready_attempts=0
<line>:    nginx_ready_attempts=$((nginx_ready_attempts + 1))
<line>:health_attempts=0
<line>:  health_attempts=$((health_attempts + 1))
```

- [ ] **Step 4: Commit**

```bash
git add deploy.sh
git commit -m "fix: poll nginx readiness before certbot, retry bootstrap health check"
```

---

## Task 6: Final verification

- [ ] **Step 1: Confirm no regressions in changed files**

Run:
```bash
grep -n "cancel-in-progress" .github/workflows/deploy.yml
grep -n "curl -k" .github/workflows/deploy.yml
grep -n "github.token" .github/workflows/deploy.yml
grep -n "node-version" .github/workflows/release.yml
grep -n "prisma migrate" apps/api/Dockerfile
grep -n "networks" docker-compose.deploy.yml | grep -A1 "certbot"
grep -n "sleep 3" deploy.sh
```

Expected: `cancel-in-progress: false`, no `curl -k`, no inline `github.token`, both `node-version: 20`, no `prisma migrate` in Dockerfile, certbot has networks entry, no `sleep 3`.

- [ ] **Step 2: Confirm deploy workflow migration step is intact**

```bash
grep -n "prisma migrate" .github/workflows/deploy.yml
```

Expected:
```
303:              docker compose "${compose_args[@]}" exec -T api npx prisma migrate deploy --schema=/app/packages/prisma/schema.prisma
```

- [ ] **Step 3: Confirm pkg_target entries are untouched**

```bash
grep -n "pkg_target" .github/workflows/release.yml
```

Expected — all four targets still reference `node18`:
```
55:          - pkg_target: node18-linux-x64
58:          - pkg_target: node18-macos-x64
61:          - pkg_target: node18-macos-arm64
64:          - pkg_target: node18-win-x64
```
