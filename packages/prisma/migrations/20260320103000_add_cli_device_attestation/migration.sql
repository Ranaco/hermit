CREATE TYPE "DeviceClientType" AS ENUM ('BROWSER', 'CLI');

ALTER TABLE "Device"
ADD COLUMN     "clientType" "DeviceClientType" NOT NULL DEFAULT 'BROWSER',
ADD COLUMN     "publicKey" TEXT,
ADD COLUMN     "hardwareFingerprint" TEXT,
ADD COLUMN     "enrolledAt" TIMESTAMP(3),
ADD COLUMN     "trustedAt" TIMESTAMP(3);

CREATE TABLE "CliRequestNonce" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CliRequestNonce_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CliRequestNonce_deviceId_nonce_key" ON "CliRequestNonce"("deviceId", "nonce");
CREATE INDEX "CliRequestNonce_deviceId_expiresAt_idx" ON "CliRequestNonce"("deviceId", "expiresAt");

ALTER TABLE "CliRequestNonce" ADD CONSTRAINT "CliRequestNonce_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
