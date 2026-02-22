DO $$
BEGIN
  ALTER TYPE "ResourceType" RENAME VALUE 'GROUP' TO 'TEAM';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN invalid_parameter_value THEN NULL;
  WHEN undefined_object THEN NULL;
END
$$;
