# Hermit CLI Revamp - 2026-03-06

This update revamps the Hermit CLI into a publish-ready, terminal-native interface aligned with the current Hermit API.

## Included

- global runtime flags: `--json`, `--non-interactive`, `--no-color`
- shared CLI runtime, prompt, context, and SDK layers
- updated auth flows using current API contracts
- new command families:
  - `team`
  - `key`
  - `group`
- rewritten `secret`, `vault`, `org`, `config`, `run`, and `whoami` commands
- `.hermit.yml` validation and path-aware environment resolution
- publish-ready package metadata for `apps/cli/package.json`
- CLI-local ESLint config

## Command surface delivered

- `auth`: login, logout, status, MFA setup/enable/disable
- `org`: list, create, select, current
- `team`: list, create, members, add-member
- `vault`: list, create, select, get, delete
- `key`: list, create, get, rotate, delete
- `group`: list, create, update, delete, tree
- `secret`: list, set, get, delete
- `run`: bulk secret injection with vault/group/path/environment resolution
- `config`: init, show, set-server
- `whoami`: current session and active context summary

## Current outcome

- `npm run -w apps/cli check-types` passes
- `npm run -w apps/cli lint` passes
- `npm run -w apps/cli build` passes

## Notes

- The CLI now uses `/auth/refresh` instead of the outdated refresh route.
- Secret injection uses bulk reveal instead of per-secret reveal loops.
- Secret hierarchy supports both `group` naming and path-first UX.
- Package metadata now includes publish-ready files, Node engine constraints, and public publish config.
