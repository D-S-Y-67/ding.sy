"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth-client";

/**
 * OAuth provider row. To add Apple later: add one entry here (plus its
 * server-side provider config in `lib/auth.ts`) — nothing else changes.
 */
const PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    start: signInWithGoogle,
    Icon: GoogleLogo,
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

export function ProviderButtons() {
  const [pending, setPending] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(provider: (typeof PROVIDERS)[number]) {
    setPending(provider.id);
    setError(null);
    try {
      // The OAuth flow navigates away; pending state holds until it does.
      await provider.start();
    } catch {
      setPending(null);
      setError(
        `${provider.label.replace("Continue with ", "")} sign-in couldn't start. Try again.`,
      );
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={pending !== null}
          onClick={() => void start(provider)}
          // Styled to Google's dark-theme button spec: #131314 fill,
          // #747775 stroke, #e3e3e3 label in Roboto Medium, 18px logo.
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[#747775] bg-[#131314] font-google text-sm tracking-[0.02em] text-[#e3e3e3] transition-[transform,background-color] duration-(--duration-press) ease-out-quint hover:bg-[#1f2023] focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none active:scale-[0.97] disabled:cursor-default disabled:opacity-70 disabled:hover:bg-[#131314] disabled:active:scale-100"
        >
          {pending === provider.id ? <ProviderSpinner /> : <provider.Icon />}
          {provider.label}
        </button>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Official multi-colour "G" — colours must not be altered per brand rules. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

function ProviderSpinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
