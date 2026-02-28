const fs = require('fs');
let schema = fs.readFileSync('./packages/prisma/schema.prisma', 'utf8');

// 1. User
schema = schema.replace(/    vaultPermissions           VaultBinding\[\]\n/, '');
schema = schema.replace(/    keyPermissions             KeyBinding\[\]\n/, '');
schema = schema.replace(/    secretGroupBindings        SecretGroupBinding\[\]\n/, '');
schema = schema.replace(/    secretBindings             SecretBinding\[\]\n/, '');

// 2. Organization
schema = schema.replace(/    roles       OrganizationRole\[\]\n\}/, '    roles       OrganizationRole[]\n    policies    Policy[]\n}');

// 3. Vault
schema = schema.replace(/    permissions    VaultBinding\[\]\n/, '');

// 4. Key
schema = schema.replace(/    permissions      KeyBinding\[\]\n/, '');

// 5. VaultBinding and KeyBinding
schema = schema.replace(/model VaultBinding \{[\s\S]*?@@map\("VaultPermission"\)\n\}\n\nmodel KeyBinding \{[\s\S]*?@@map\("KeyPermission"\)\n\}\n\n/, '');

// 6. Team
schema = schema.replace(/    vaultBindings       VaultBinding\[\]\n    keyBindings         KeyBinding\[\]\n    secretGroupBindings SecretGroupBinding\[\]\n    secretBindings      SecretBinding\[\]\n/, '    roleAssignments     TeamRoleAssignment[]\n');

// 7. Secret
schema = schema.replace(/    bindings         SecretBinding\[\]\n/, '');

// 8. SecretBinding
schema = schema.replace(/model SecretBinding \{[\s\S]*?@@unique\(\[teamId, secretId\]\)\n\}\n\n/, '');

// 9. OrganizationRole
schema = schema.replace(/    members        OrganizationMember\[\]\n/, '    members           OrganizationMember[]\n    policyAttachments RolePolicyAttachment[]\n    teamAssignments   TeamRoleAssignment[]\n');

// 10. SecretGroup and SecretGroupBinding + Additions
schema = schema.replace(/    bindings    SecretGroupBinding\[\]\n\n    @@unique\(\[vaultId, parentId, name\]\)\n\}\n\nmodel SecretGroupBinding \{[\s\S]*?@@unique\(\[teamId, secretGroupId\]\)\n\}/, 
`    @@unique([vaultId, parentId, name])
}

model Policy {
    id             String                 @id @default(uuid())
    organizationId String
    name           String
    description    String?
    document       Json
    isManaged      Boolean                @default(false)
    createdAt      DateTime               @default(now())
    updatedAt      DateTime               @updatedAt
    organization   Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    roles          RolePolicyAttachment[]

    @@unique([organizationId, name])
}

model RolePolicyAttachment {
    id       String           @id @default(uuid())
    roleId   String
    policyId String
    role     OrganizationRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
    policy   Policy           @relation(fields: [policyId], references: [id], onDelete: Cascade)

    @@unique([roleId, policyId])
}

model TeamRoleAssignment {
    id        String           @id @default(uuid())
    teamId    String           @map("groupId")
    roleId    String
    team      Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
    role      OrganizationRole @relation(fields: [roleId], references: [id], onDelete: Cascade)

    @@unique([teamId, roleId])
}`);

fs.writeFileSync('./packages/prisma/schema.prisma', schema);
console.log("Schema updated.");
