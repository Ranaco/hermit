---
"@hermit-kms/cli": patch
---

Fix `hermit run` consuming the first command word as an inject path when explicit flags (--group, --path, etc.) are already set. `hermit run --group "team" npm run dev` now correctly runs `npm run dev` instead of `run dev`.
