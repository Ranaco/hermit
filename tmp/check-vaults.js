const { PrismaClient } = require("./packages/prisma/index.js");

async function main() {
  const prisma = new PrismaClient();
  const userId = "42abfd02-65d2-4edf-9b15-400d445d0e36";
  const orgId = "c67b6c8d-a979-49cb-8ecb-e10daab1bcb7";
  const vaultId = "ad913486-2b20-4ad9-8511-bf389dd51a6f";

  console.log("Checking if user", userId, "is a member of org", orgId);
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    include: { role: true }
  });

  console.log("Membership in target org:", membership ? `YES (Role: ${membership.role?.name})` : "NO");

  const vaults = await prisma.vault.findMany({
    where: { organizationId: orgId }
  });
  console.log(`Vaults in target org:`, vaults.map(v => v.id).join(", "));
  
  const myVaults = await prisma.vault.findMany({
     where: { organizationId: "4d787a80-3c1c-4167-831f-15ff117381dd" }
  });
  console.log("Vaults in user's known org:", myVaults.map(v => v.id).join(", "));
}

main().catch(console.error).finally(() => process.exit(0));
