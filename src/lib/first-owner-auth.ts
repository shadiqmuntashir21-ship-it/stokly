import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { getPool } from "@/lib/db";

export const firstOwnerAuth = betterAuth({
  database: getPool(),
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 8 },
  plugins: [username({ displayUsername: false, immutableUsername: true, minUsernameLength: 3, maxUsernameLength: 30 })]
});
