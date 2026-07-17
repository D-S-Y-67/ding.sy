/**
 * Maps error codes arriving on the login page's `?error=` query param to
 * human messages. Codes come from magic-link verification failures and
 * OAuth callbacks (wired in M3); messages state what went wrong and what
 * to do next — never vague, never apologetic.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  EXPIRED_TOKEN: "That sign-in link has expired. Request a fresh one below.",
  INVALID_TOKEN:
    "That sign-in link is no longer valid — it may have been used already. Request a new one below.",
  access_denied: "Sign-in was cancelled. Choose a method below to continue.",
};

const FALLBACK_MESSAGE =
  "Sign-in didn't complete. Try again below — a fresh attempt usually fixes it.";

export function describeAuthError(code: string | undefined): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? FALLBACK_MESSAGE;
}
