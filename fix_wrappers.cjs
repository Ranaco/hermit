const fs = require('fs');
let vaultStr = fs.readFileSync('apps/api/src/wrappers/vault.wrapper.ts', 'utf8');

// Strip PermissionLevel import
vaultStr = vaultStr.replace(/import \{ PermissionLevel \} from "@hermit\/prisma";\n/, '');

// Fix createVault permissions insertion
vaultStr = vaultStr.replace(/        permissions: \{\n          create: \{\n            userId,\n            permissionLevel: "ADMIN" as PermissionLevel,\n          \},\n        \},\n/, '');
vaultStr = vaultStr.replace(/        permissions: true,\n/, '');

// Fix getVaults WhereClause
vaultStr = vaultStr.replace(/    const orgMemberships = await prisma\.organizationMember\.findMany\(\{\n      where: \{ userId \},\n      include: \{ role: true \},\n    \}\);\n    \n    const adminOrgs = orgMemberships\n      \.filter\(m => m\.role\?\.name === "ADMIN" \|\| m\.role\?\.name === "OWNER"\)\n      \.map\(m => m\.organizationId\);\n\n    const whereClause = \{[\s\S]*?      \.\.\.\(organizationId \? \{ organizationId \} : \{\}\),\n    \};\n/,
`    const orgMemberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: { role: true },
    });
    
    const orgIds = orgMemberships.map(m => m.organizationId);

    const whereClause = {
      organizationId: organizationId ? organizationId : { in: orgIds }
    };`);

// Fix getVault permissions include
vaultStr = vaultStr.replace(/        permissions: \{\n          include: \{\n            user: \{\n              select: \{\n                id: true,\n                email: true,\n                username: true,\n                firstName: true,\n                lastName: true,\n              \},\n            \},\n            team: \{\n              select: \{\n                id: true,\n                name: true,\n              \},\n            \},\n          \},\n        \},\n/, '');

// Remove all grant/revoke
vaultStr = vaultStr.replace(/  \/\*\*\n   \* Grant vault permissions to a user\n   \*\/[\s\S]*?\}\n\};\n$/, '};\n');

fs.writeFileSync('apps/api/src/wrappers/vault.wrapper.ts', vaultStr);

console.log("Vault Wrapper Fixed");
