-- CreateTable
CREATE TABLE "SecretBinding" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "secretId" TEXT NOT NULL,
    "permissionLevel" "PermissionLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretBinding_userId_secretId_key" ON "SecretBinding"("userId", "secretId");

-- CreateIndex
CREATE UNIQUE INDEX "SecretBinding_groupId_secretId_key" ON "SecretBinding"("groupId", "secretId");

-- AddForeignKey
ALTER TABLE "SecretBinding" ADD CONSTRAINT "SecretBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretBinding" ADD CONSTRAINT "SecretBinding_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretBinding" ADD CONSTRAINT "SecretBinding_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "Secret"("id") ON DELETE CASCADE ON UPDATE CASCADE;
