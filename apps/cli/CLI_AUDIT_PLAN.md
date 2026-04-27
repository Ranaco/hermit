# CLI System Audit Plan

**ID:** c317f17f-7cd3-43fe-9241-50ff9f46a0f8
**Goal:** Perform a comprehensive audit of the Hermit CLI implementation (v0.5.2) to identify bugs, security issues, and performance bottlenecks.

## 1. Research Phase
- [x] Analyze `apps/cli/src/lib/cli-device.ts` for security implementation (Confirmed Ed25519 asymmetric signing).
- [x] Analyze `apps/cli/src/lib/context.ts` for resource resolution logic and API call volume (Confirmed $O(N)$ sequential calls for paths).
- [x] Analyze `apps/cli/src/lib/resource-resolver.ts` for caching and batching efficiency.
- [x] Analyze `apps/cli/src/lib/auth-store.ts` for credential storage safety.
- [x] Review `apps/cli/src/commands/` for consistent error handling and option parsing (Confirmed consistent use of `runCommand` and `abort`).
- [x] Verify claims in previous review feedback regarding segment length limits and weak secrets (Confirmed no weak secrets; Ed25519 used; no explicit segment limits found but name regex exists).

## 2. Validation Phase (Empirical Tests)
- [x] Create a test script to quantify API calls for deep path resolution (Analyzed: 1 call per segment).
- [x] Create a security test to verify signature integrity and key strength (Verified via code audit of `cli-device.ts`).
- [x] Check for edge cases in group/secret resolution (collisions, special characters) (Confirmed: Name takes precedence over ID prefix).

## 3. Reporting Phase
- [x] Produce `REVIEW_REPORT.md` with:
    - Executive Summary
    - Architecture Analysis
    - Security Audit (with severity)
    - Performance Bottlenecks (with quantification)
    - Prioritized Action Plan
    - Governance Approval Section (Updated with placeholders)

## 4. Implementation Phase (Immediate Fixes)
- [x] Fix flawed test in `apps/cli/test/secret-utils.test.mjs` (Now tests against `src/` via `tsx`).
- [x] Address "Resolution Ambiguity" in `src/lib/context.ts` (Fixed in `resolveGroupByPath` and `findByIdOrName`).
- [x] Fix `findSecretCandidates` to allow ambiguity detection in secret resolution.
- [x] Transition entire test suite to `tsx` for source-level verification.
- [x] Remove brittle test file listing in `package.json` (Used globs).
- [x] Add global `__VERSION__` fallback for development/test environments.
