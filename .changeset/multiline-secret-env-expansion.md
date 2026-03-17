---
"@hermit-kms/cli": patch
---

Expand MULTILINE secrets as dotenv key-value pairs during `run` injection. Each `KEY=VALUE` line in a multiline secret is injected as a separate environment variable, with support for quoted values and comment lines. Non-dotenv multiline secrets (e.g. certificates) fall back to single-variable injection.
