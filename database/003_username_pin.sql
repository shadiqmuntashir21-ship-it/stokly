-- Better Auth username plugin and persisted rate limiting.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stokly_username ON "user" ("username");
CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL DEFAULT 0,
  "lastRequest" bigint NOT NULL
);
