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

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}
