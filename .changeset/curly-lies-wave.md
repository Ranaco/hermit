---
"@hermit-kms/cli": minor
---

Harden the CLI and expand its scripting and automation support.

- unify shorthand commands with shared handlers so auth and secret flows stay in sync
- improve shell ergonomics with raw/plain output modes, quiet mode, stdin-aware secret input, and bulk env export/import commands
- harden Windows `hermit run` process spawning to preserve arguments safely
- add shared cached group/secret resolution for faster and more consistent lookup behavior
- replace the fixed local store encryption key with a generated per-user key and automatic legacy migration
- expand test coverage with end-to-end CLI integration tests
