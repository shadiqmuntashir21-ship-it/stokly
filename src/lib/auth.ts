import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "@/lib/db";

export const auth = betterAuth({
  database: getPool(),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, maxPasswordLength: 8 },
  disabledPaths: ["/sign-in/email", "/is-username-available"],
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: { "/sign-in/username": { window: 600, max: 5 }, "/change-password": { window: 600, max: 5 } }
  },
  session: { cookieCache: { enabled: true, maxAge: 60 } },
  plugins: [
    username({ displayUsername: false, immutableUsername: true, minUsernameLength: 3, maxUsernameLength: 30 }),
    nextCookies()
  ]
});
