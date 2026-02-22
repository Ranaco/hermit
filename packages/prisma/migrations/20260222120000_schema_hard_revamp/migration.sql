-- Create onboarding state enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OnboardingState') THEN
    CREATE TYPE "OnboardingState" AS ENUM ('IN_PROGRESS', 'COMPLETED');
  END IF;
END $$;

-- Add slug to organizations for stable external identifiers
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Backfill slug values for existing rows
UPDATE "Organization"
SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(MD5("id") FROM 1 FOR 6)
WHERE "slug" IS NULL;

-- Enforce uniqueness on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Organization_slug_key'
  ) THEN
    CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
  END IF;
END $$;

-- Convert onboarding status text to enum values
ALTER TABLE "OrganizationMember"
ALTER COLUMN "onboardingStatus" TYPE "OnboardingState"
USING (
  CASE
    WHEN "onboardingStatus" IN ('completed', 'COMPLETED') THEN 'COMPLETED'::"OnboardingState"
    ELSE 'IN_PROGRESS'::"OnboardingState"
  END
);

ALTER TABLE "OrganizationMember"
ALTER COLUMN "onboardingStatus" SET DEFAULT 'IN_PROGRESS';
