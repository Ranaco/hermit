ALTER TABLE "SecretGroup"
ADD COLUMN "path" TEXT,
ADD COLUMN "depth" INTEGER;

WITH RECURSIVE "group_tree" AS (
  SELECT
    "id",
    "parentId",
    "id"::text AS "path",
    0 AS "depth"
  FROM "SecretGroup"
  WHERE "parentId" IS NULL

  UNION ALL

  SELECT
    child."id",
    child."parentId",
    ("group_tree"."path" || '/' || child."id")::text AS "path",
    "group_tree"."depth" + 1 AS "depth"
  FROM "SecretGroup" child
  INNER JOIN "group_tree" ON child."parentId" = "group_tree"."id"
)
UPDATE "SecretGroup" AS target
SET
  "path" = "group_tree"."path",
  "depth" = "group_tree"."depth"
FROM "group_tree"
WHERE target."id" = "group_tree"."id";

UPDATE "SecretGroup"
SET
  "path" = "id",
  "depth" = 0
WHERE "path" IS NULL OR "depth" IS NULL;

ALTER TABLE "SecretGroup"
ALTER COLUMN "path" SET NOT NULL,
ALTER COLUMN "depth" SET NOT NULL;

CREATE INDEX "SecretGroup_vaultId_path_idx" ON "SecretGroup"("vaultId", "path");
