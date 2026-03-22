---
"@hermit-kms/cli": patch
---

Improve the Hermit CLI release with safer runtime behavior, better scripting support, and stronger test coverage.

- unify shorthand and nested command handlers so auth, group, and secret flows stay consistent
- add better scripting ergonomics with output modes, quiet mode, stdin-aware secret input, and env import/export support
- harden Windows command execution so `hermit run` preserves arguments safely
- reduce repeated group and secret resolution work with shared cached lookup logic
- harden the local auth store with per-user key migration and lazy initialization so metadata commands like `--version` do not fail on a broken store
- expand integration coverage for login, logout, raw secret output, env export, and secret import flows
