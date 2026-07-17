import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt, magicLink } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendMagicLinkEmail } from "./email/send-magic-link";
import { optionalEnv, requireEnvAtRuntime, resolveBaseUrl } from "./env";

const baseURL = resolveBaseUrl();

const microsoftClientId = optionalEnv("MICROSOFT_CLIENT_ID");
const microsoftClientSecret = optionalEnv("MICROSOFT_CLIENT_SECRET");

/**
 * Server-side auth configuration — the single place providers, tokens and
 * storage are wired together.
 *
 * Adding another provider later (Google, Apple, …): add its entry to
 * `socialProviders` (with env vars) and one entry to PROVIDERS in
 * components/auth/ProviderButtons. Nothing else changes.
 */
export const auth = betterAuth({
  appName: "Regmaglypt",
  baseURL,
  secret: requireEnvAtRuntime("BETTER_AUTH_SECRET", "build-placeholder-secret"),
  database: drizzleAdapter(db, { provider: "pg", schema }),

  socialProviders:
    microsoftClientId && microsoftClientSecret
      ? {
          microsoft: {
            clientId: microsoftClientId,
            clientSecret: microsoftClientSecret,
            // "common" = personal + work/school accounts; override with a
            // tenant ID to restrict sign-in to one organisation.
            tenantId: optionalEnv("MICROSOFT_TENANT_ID") ?? "common",
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
