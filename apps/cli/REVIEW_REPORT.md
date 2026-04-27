# Hermit CLI — Comprehensive Review Report

**Date:** April 27, 2026  
**Version:** 0.5.2  
**Status:** Completed

## 1. Executive Summary

The Hermit CLI has undergone significant hardening and refactoring in recent versions (0.5.x). The architecture is now modular, with unified handlers for shorthands and nested commands. Security is a strong point, featuring request signing and encrypted local storage. However, performance remains a concern due to high API call volume for resource resolution, particularly for deep group hierarchies.

## 2. Analysis of CLI Source Files

The codebase is organized into a clean layered architecture:

- **`index.ts`**: Entry point using Commander.js. Correctly delegates logic to shared handlers.
- **`commands/`**: Command definitions and option parsing.
- **`lib/`**: Core logic and utilities.
    - `auth-handlers.ts`, `secret-handlers.ts`, `group-handlers.ts`: Unified business logic.
    - `sdk.ts`: Clean API abstraction.
    - `api-client.ts`: Handles auth, token refresh, and request signing.
    - `resource-resolver.ts`: Logic for finding groups and secrets with basic caching.
    - `ui.ts`: Rich terminal UI library with support for various output modes.
- **`types/`**: Shared TypeScript interfaces.

### Strengths
- **Modular Design**: Easy to add new commands without duplicating logic.
- **Consistency**: Shorthands (`hermit get`) and nested commands (`hermit secret get`) use the same code paths.
- **Scripting Support**: Robust support for non-TTY environments, pipeable output (`-o raw`), and quiet modes.

## 3. Bugs and Security Issues

### Security Audit
| Item | Status | Notes |
| :--- | :--- | :--- |
| **Local Credential Storage** | **Secure** | Encrypted using `Conf` with a per-user generated 256-bit key. Key file is `0o600`. |
| **Request Integrity** | **Secure** | Every request to sensitive endpoints is signed with an Ed25519 device key (`X-Hermit-Signature`). |
| **Secrets in History** | **Addressed** | Stdin support for `set` and `import` avoids passing secrets as CLI arguments. |
| **Sensitive Output** | **Addressed** | `run` and `export` mask values in UI; `get` requires explicit request for raw output. |

### Known Issues & Minor Bugs
- **Resolution Collisions**: If a group name matches another group's ID prefix, resolution might be ambiguous (though the code tries exact name match first).
- **Broken Store Recovery**: While startup crashes are fixed, a corrupted store still requires manual deletion or re-auth (could be more automated).

## 4. Performance Bottlenecks

| Bottleneck | Impact | Quantification |
| :--- | :--- | :--- |
| **Deep Path Resolution** | **High** | `resolveGroupByPath` makes 1 API call per path segment. A path like `a/b/c/d` takes 4 calls just to find the group. |
| **Recursive Tree Fetch** | **Medium** | `getAccessibleGroupTree` makes 1 API call per group node. |
| **Redundant Scope Lookup** | **Medium** | Every command invocation calls `getOrganizations` and `getVaults` to resolve the active context, even if IDs are cached. |
| **SDK Fetching** | **Low** | `listSecretsForGroup` fetches secrets in batches of 200. Efficient for most users, but slow for thousands of secrets. |

## 5. Prioritized Improvement Plan

### High Priority (Immediate)
1. **Context Caching**: Cache the results of `getOrganizations` and `getVaults` for a short duration (e.g., 5 minutes) or until an explicit `select` command is run.
2. **Bulk Group Fetching**: Modify the API and CLI to allow fetching the entire group tree in a single request (or a single request per vault).
3. **Optimized Path Resolution**: If the full group tree is cached or fetched in bulk, `resolveGroupByPath` can happen entirely client-side.

### Medium Priority
1. **Fuzzy Path Suggestions**: When a path segment fails, use Levenshtein distance to suggest the closest existing group name.
2. **Auto-Repair Auth Store**: If decryption fails, automatically offer to reset the local store and prompt for login instead of throwing a hard error.
3. **Shell Completion**: Generate static completion scripts for Bash/Zsh/Fish to improve DX.

### Low Priority
1. **Parallel Secret Fetching**: For `run` and `export`, if multiple groups are targeted, fetch them in parallel.
2. **Streaming Output**: For very large secret lists, stream the output to the terminal as it arrives.

## 6. Conclusion

The Hermit CLI is in a "Healthy" state with strong security foundations. Moving from $O(N)$ API calls to $O(1)$ for resource resolution should be the primary focus for the next major release (0.6.0).
