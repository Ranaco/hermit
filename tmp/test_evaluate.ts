import { evaluateAccess } from "../apps/api/src/services/policy-engine.ts";

async function main() {
  const userId = "d5728909-e9dc-4fcf-a1bd-a04f3bee29ae"; // john@gmail.com
  const orgId = "c67b6c8d-a979-49cb-8ecb-e10daab1bcb7";
  const action = "keys:read";
  const resourceUrn = "urn:hermes:org:c67b6c8d-a979-49cb-8ecb-e10daab1bcb7:vault:ad913486-2b20-4ad9-8511-bf389dd51a6f:key:*";

  console.log("Evaluating access...");
  const isAllowed = await evaluateAccess(userId, orgId, action, resourceUrn);
  console.log("Allowed:", isAllowed);
}

main().catch(console.error).finally(() => process.exit(0));
