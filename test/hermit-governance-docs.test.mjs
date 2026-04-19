import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

test("registers U_COMPLIANCE_OFFICER as Compliance Auditor in the governance registry", () => {
  const registryPath = path.join(
    repoRoot,
    "docs/governance/hermit-governance-registry.json",
  );
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

  assert.ok(
    registry.project.auditorAssignments.some(
      (assignment) =>
        assignment.userId === "U_COMPLIANCE_OFFICER" &&
        assignment.role === "Compliance Auditor",
    ),
  );
});

test("documents the SOC2 Level 2 audit-trail requirement for secret-management services", () => {
  const securityModelPath = path.join(
    repoRoot,
    "apps/docs/src/content/security-model.mdx",
  );
  const projectDocPath = path.join(repoRoot, "docs/hermit.md");

  const securityModel = fs.readFileSync(securityModelPath, "utf8");
  const projectDoc = fs.readFileSync(projectDocPath, "utf8");

  assert.match(securityModel, /SOC2-Level-2 audit trail/);
  assert.match(securityModel, /secret-management services/);
  assert.match(projectDoc, /SOC2-Level-2 audit trail/);
  assert.match(projectDoc, /secret-management services/);
});

test("records the auditor assignment and documentation update in the compliance audit log", () => {
  const auditLogPath = path.join(
    repoRoot,
    "docs/governance/compliance-audit-log.jsonl",
  );
  const entries = fs
    .readFileSync(auditLogPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  assert.ok(
    entries.some(
      (entry) =>
        entry.action === "REGISTER_COMPLIANCE_AUDITOR" &&
        entry.details.includes("U_COMPLIANCE_OFFICER"),
    ),
  );
  assert.ok(
    entries.some(
      (entry) =>
        entry.action === "UPDATE_SECRET_MANAGEMENT_AUDIT_REQUIREMENT" &&
        entry.details.includes("SOC2-Level-2 audit trail"),
    ),
  );
});
