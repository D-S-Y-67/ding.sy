/**
 * Client-side auth entry points the login UI is built against.
 *
 * M2 ships UI-only stubs with realistic latency so every form state is
 * demonstrable; M3 replaces the internals with Better Auth client calls
 * without changing these signatures.
 */

const SIMULATED_LATENCY_MS = 900;

export async function sendMagicLink(email: string): Promise<void> {
  void email;
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
}

export async function signInWithGoogle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
}
