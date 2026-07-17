import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Client-side auth entry points. The login UI was built against these
 * signatures in M2; M3 wired them to Better Auth.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await authClient.signIn.magicLink({
    email,
    // Where the verification link lands the user on success…
    callbackURL: "/home",
    // …and where failures (expired/used token) return them; Better Auth
    // appends ?error=<code>, which the login page maps to a message.
    errorCallbackURL: "/",
    newUserCallbackURL: "/home",
  });
  if (error) {
    throw new Error(error.message ?? "Magic link request failed");
  }
}

export async function signInWithMicrosoft(): Promise<void> {
  const { error } = await authClient.signIn.social({
    provider: "microsoft",
    callbackURL: "/home",
    errorCallbackURL: "/",
  });
  if (error) {
    throw new Error(error.message ?? "Microsoft sign-in failed to start");
  }
}
