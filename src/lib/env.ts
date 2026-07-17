/**
 * Server-side environment access. Required variables fail fast with a
 * message naming the variable; optional ones return undefined so features
 * can degrade cleanly (e.g. dev magic links log to the console when
 * RESEND_API_KEY is absent).
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.local.example for setup.`,
    );
  }
  return value;
}

/**
 * Like requireEnv, but tolerates absence during `next build` — Vercel builds
 * don't always have runtime secrets, and page-data collection imports server
 * modules. The placeholder never survives to a running server: at request
 * time (any phase other than the production build) a missing value throws.
 */
export function requireEnvAtRuntime(name: string, buildFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NEXT_PHASE === "phase-production-build") return buildFallback;
  throw new Error(
    `Missing required environment variable ${name}. See .env.local.example for setup.`,
  );
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * The app's absolute base URL — also the auth base and JWT issuer.
 * Priority: explicit BETTER_AUTH_URL (set this in production so the issuer
 * stays stable) → Vercel's per-deployment URL (makes previews work
 * unconfigured) → localhost.
 */
export function resolveBaseUrl(): string {
  const explicit = optionalEnv("BETTER_AUTH_URL");
  if (explicit) return explicit;
  const vercelUrl = optionalEnv("VERCEL_URL");
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}
