-- STOKLY V4: approved staff devices, additive and isolated until release.
CREATE TABLE IF NOT EXISTS staff_devices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash char(64) NOT NULL UNIQUE,
 operator_name varchar(100) NOT NULL,
 role varchar(15) NOT NULL CHECK(role IN('admin','marketing')),
 status varchar(15) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz,
 approved_by text,
 revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_staff_devices_status ON staff_devices(status,created_at DESC);
