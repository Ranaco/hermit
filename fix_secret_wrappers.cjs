const fs = require('fs');
let secretStr = fs.readFileSync('apps/api/src/wrappers/secret.wrapper.ts', 'utf8');

// Strip PermissionLevel import
secretStr = secretStr.replace(/import \{ PermissionLevel \} from "@hermit\/prisma";\n/, '');

// Fix getSecrets whereClause: In GET /secrets, secrets must be fetched for the vault.
// Wait, secretWrapper.getSecrets queries where { vaultId } already. So it's fine.

// Remove all grant/revoke/get permissions from secret wrapper
secretStr = secretStr.replace(/  \/\*\*\n   \* Get explicit permission bindings for a secret\n   \*\/[\s\S]*?\}\n\};\n$/, '};\n');

fs.writeFileSync('apps/api/src/wrappers/secret.wrapper.ts', secretStr);


let groupStr = fs.readFileSync('apps/api/src/wrappers/secret-group.wrapper.ts', 'utf8');

// Strip PermissionLevel import
groupStr = groupStr.replace(/import \{ PermissionLevel \} from "@hermit\/prisma";\n/, '');

// Remove all grant/revoke/get permissions from group wrapper
groupStr = groupStr.replace(/  \/\*\*\n   \* Get explicit permission bindings for a secret group\n   \*\/[\s\S]*?\}\n\};\n$/, '};\n');

fs.writeFileSync('apps/api/src/wrappers/secret-group.wrapper.ts', groupStr);

console.log("Secret & Group Wrappers Fixed");
