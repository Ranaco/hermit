import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const vaultId = "ad913486-2b20-4ad9-8511-bf389dd51a6f";
  const userId = "42abfd02-65d2-4edf-9b15-400d445d0e36";

  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: { createdBy: true, organization: true }
  });

  console.log("Vault details:");
  console.log("Vault Name:", vault?.name);
  console.log("Created By:", vault?.createdBy?.email, `(ID: ${vault?.createdById})`);
  console.log("Org ID:", vault?.organizationId);
  console.log("Org Name:", vault?.organization?.name);
  
  // Did the user create this vault?
  console.log("Did the user create this vault?", vault?.createdById === userId);
}

main().catch(console.error).finally(() => process.exit(0));
