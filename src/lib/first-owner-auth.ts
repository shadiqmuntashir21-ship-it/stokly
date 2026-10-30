import { betterAuth } from "better-auth";
import { getPool } from "@/lib/db";

// This server-only instance has no public route. Public /api/auth remains signup-disabled.
// Only /setup's server action may call signUpEmail, after checking its one-time secret.
export const firstOwnerAuth = betterAuth({
  database: getPool(),
  emailAndPassword: { enabled: true, minPasswordLength: 12 }
});
