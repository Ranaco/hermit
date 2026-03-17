---
"@hermit-kms/cli": patch
---

Fix `hermit run --secret` crashing when `valueType` is undefined in bulk reveal response. Also fall back to ID-prefix matching when no secret name matches exactly, so `--secret 5` finds a secret whose ID starts with `5`.
