CREATE TABLE IF NOT EXISTS trusted_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash text NOT NULL UNIQUE,
 label varchar(120) NOT NULL,
 activated_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_active ON trusted_devices(expires_at) WHERE revoked_at IS NULL;
INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt")
VALUES ('stokly:room:admin','Room Admin','room-admin@accounts.stokly.invalid',true,now(),now()),
('stokly:room:marketing','Room Marketing','room-marketing@accounts.stokly.invalid',true,now(),now())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO user_roles(user_id,role) VALUES
('stokly:room:admin','admin'),('stokly:room:marketing','marketing')
ON CONFLICT(user_id) DO NOTHING;