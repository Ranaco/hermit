# Hermit CLI — Comprehensive Review Report (v0.5.2)

**Date:** April 27, 2026  
**Status:** Under Review  
**Auditor:** Gemini CLI Agent

## 1. Executive Summary

The Hermit CLI (v0.5.2) is a robust, secure, and modular secret management tool. It features a clean layered architecture and a sophisticated terminal UI. Security is a primary design goal, implemented via Ed25519 asymmetric request signing and encrypted local storage. 

This audit successfully identified and resolved critical resolution ambiguity bugs in resource identification and improved the testing infrastructure by transitioning to source-level verification. Performance bottlenecks in resource resolution due to sequential API call volume remain the primary area for architectural improvement.

## 2. Architecture Analysis

The codebase follows modern TypeScript best practices with a clear separation of concerns:

- **Command Layer (`src/commands/`)**: Handles CLI argument parsing and delegates to unified handlers.
- **Handler Layer (`src/lib/*-handlers.ts`)**: Implements business logic shared between shorthand and nested commands.
- **Utility Layer (`src/lib/context.ts`, `src/lib/secret-utils.ts`)**: Provides cross-cutting logic for resource resolution and environmental detection.
- **SDK Layer (`src/lib/sdk.ts`, `src/lib/api-client.ts`)**: Clean abstraction for the backend API.
- **UI Layer (`src/lib/ui.ts`)**: Rich, theme-aware terminal rendering with support for non-TTY environments.

### Improvements in this Audit
- **Source-Level Testing**: The test suite has been updated to use `tsx` to run tests directly against TypeScript source files, removing the brittle dependency on build artifacts.
- **Robustness**: Error handling in path resolution now provides clearer context on failure points.

## 3. Security Audit

| Component | Status | Finding | Severity |
| :--- | :--- | :--- | :--- |
| **Request Integrity** | **Secure** | Every sensitive request is signed with a local **Ed25519** private key (`X-Hermit-Signature`). | Low Risk |
| **Credential Storage** | **Secure** | Local store (`config.json`) is encrypted using AES-256 via the `conf` package. | Low Risk |
| **Device Binding** | **Strong** | Device identity is bound to a `hardwareFingerprint` verified by the server. | Low Risk |
| **Key Management** | **Secure** | Private keys are generated locally and never leave the device. | Low Risk |

**Validation**: Verified that Ed25519 is used for signing in `src/lib/cli-device.ts`. HMACS were not found in the signing path, contrary to some previous reports.

## 4. Performance Bottlenecks

| Bottleneck | Impact | Quantification |
| :--- | :--- | :--- |
| **Deep Path Resolution** | **High** | Makes **1 sequential API call per path segment**. A path with 5 segments adds ~500-1000ms overhead (assuming 100-200ms RTT). |
| **Recursive Tree Fetching** | **Medium** | Recursive calls in `getAccessibleGroupTree` make one API call per group level. |
| **Redundant Context Fetch** | **Low** | Repeated organization/vault list fetches when IDs are not fully cached. |

## 5. Bugs and Issues (Fixed)

- **Resolution Ambiguity (FIXED)**: 
    - Previously, exact Name matches were prioritized over exact ID matches without checking for collisions.
    - `resolveGroupByPath` and `findByIdOrName` have been updated to detect if a name match also matches an ID prefix of another resource, aborting with a helpful error message to prevent accidental operations.
    - `findSecretCandidates` was updated to return all potential matches (union of ID, Name, and Prefix) to ensure the caller can perform full ambiguity detection.
- **Brittle Test infrastructure (FIXED)**: 
    - Tests now use glob patterns (`test/*.test.ts`) instead of explicit file lists.
    - Tests import directly from `src/` using `tsx`, ensuring the logic under test matches the current source state.

## 6. Prioritized Improvement Plan

### High Priority (Immediate)
1. **Bulk Group Tree API**: Implement a single API call to fetch the entire accessible group hierarchy for a vault.
2. **Client-side Resolution**: Transition `resolveGroupByPath` to use the cached full tree, reducing API calls from $O(\text{segments})$ to $O(1)$.

### Medium Priority
1. **Fuzzy Path Suggestions**: Use Levenshtein distance to suggest valid paths when a segment resolution fails.
2. **Parallel Bulk Reveal**: For `hermit run`, reveal secrets in parallel.

## 7. Governance Approval

| Role | Status | Date | Signature |
| :--- | :--- | :--- | :--- |
| **Security Reviewer** | [PENDING] | - | - |
| **Lead Architect** | [PENDING] | - | - |
| **Governance Board** | [PENDING] | - | - |
