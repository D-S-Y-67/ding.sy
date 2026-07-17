"use client";

import { useState } from "react";
import { signInWithMicrosoft } from "@/lib/auth-client";

/**
 * OAuth provider row. To add another provider later (Google, Apple, …):
 * add one entry here plus its server-side config in `lib/auth.ts` —
 * nothing else changes.
 */
const PROVIDERS = [
  {
    id: "microsoft",
    label: "Sign in with Microsoft",
    start: signInWithMicrosoft,
    Icon: MicrosoftLogo,
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
      setError("Microsoft sign-in couldn't start. Try again.");
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
          // Styled to Microsoft's dark-theme button spec: #2F2F2F fill,
          // white Segoe UI Semibold label, four-colour logo, 12px gap.
          className="flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-[#2f2f2f] font-provider text-sm font-semibold text-white transition-[transform,background-color] duration-(--duration-press) ease-out-quint hover:bg-[#3b3b3b] focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none active:scale-[0.97] disabled:cursor-default disabled:opacity-70 disabled:hover:bg-[#2f2f2f] disabled:active:scale-100"
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

/** Official four-square mark — colours fixed by Microsoft's brand rules. */
function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="0" y="0" width="10" height="10" fill="#F25022" />
      <rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
      <rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
      <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
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
