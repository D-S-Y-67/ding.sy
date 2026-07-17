import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt, magicLink } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendMagicLinkEmail } from "./email/send-magic-link";
import { optionalEnv, requireEnv } from "./env";

const baseURL = requireEnv("BETTER_AUTH_URL");

const googleClientId = optionalEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = optionalEnv("GOOGLE_CLIENT_SECRET");

/**
 * Server-side auth configuration — the single place providers, tokens and
 * storage are wired together.
 *
 * Adding Apple later: add an `apple` entry to `socialProviders` (with its
 * env vars) and one entry to PROVIDERS in components/auth/ProviderButtons.
 */
export const auth = betterAuth({
  appName: "Regmaglypt",
  baseURL,
  secret: requireEnv("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, { provider: "pg", schema }),

  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},

  plugins: [
    magicLink({
      // Match the UI copy: valid for 10 minutes, single use.
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),

    // Issues JWTs the Aliyun backend verifies independently against
    // GET {baseURL}/api/auth/jwks — no shared secret, no callback.
    jwt({
      jwks: {
        // RS256 over the default EdDSA: universally supported by JWT
        // libraries across backend stacks, which we don't control.
        keyPairConfig: { alg: "RS256" },
      },
      jwt: {
        issuer: baseURL,
        audience: "regmaglypt-api",
        expirationTime: "15m",
        definePayload: ({ user }) => ({
          email: user.email,
          name: user.name,
        }),
      },
    }),
  ],
});
