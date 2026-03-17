---
"@hermit-kms/cli": patch
---

Fix `hermit run --secret` not injecting env-file content as individual variables when the secret's value type is not MULTILINE. Any secret whose value contains newlines is now parsed as key=value pairs. Also adds partial ID prefix matching for `--secret` lookups: `--secret 449` matches the first secret whose ID starts with `449`.
