import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const orgId = "c67b6c8d-a979-49cb-8ecb-e10daab1bcb7";

  console.log("Looking up members for org:", orgId);
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { role: true, user: true }
  });

  console.log("Total members found:", members.length);
  for (const m of members) {
    console.log(`User: ${m.user.email} (ID: ${m.userId})`);
    console.log(`Role Name: '${m.role?.name}'`);
    console.log(`Role ID: ${m.roleId}`);
    console.log("---");
  }

  // Also resolve Vault to check org id
  const vaultId = "ad913486-2b20-4ad9-8511-bf389dd51a6f";
  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    select: { organizationId: true }
  });
  console.log("Vault Org ID:", vault?.organizationId);
}

main().catch(console.error).finally(() => process.exit(0));
