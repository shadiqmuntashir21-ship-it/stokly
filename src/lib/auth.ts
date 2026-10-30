import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "@/lib/db";

export const auth = betterAuth({
  database: getPool(),
  emailAndPassword: {
    enabled: true,
    disableSignUp: !(process.env.NODE_ENV !== "production" && process.env.STOKLY_BOOTSTRAP_ENABLED === "1"),
    minPasswordLength: 12
  },
  session: { cookieCache: { enabled: true, maxAge: 60 } },
  plugins: [nextCookies()]
});
