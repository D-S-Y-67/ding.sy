"use client";

import { useRef, useState } from "react";
import { sendMagicLink } from "@/lib/auth-client";

type FormState = "idle" | "sending" | "sent";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MagicLinkForm() {
  const [state, setState] = useState<FormState>("idle");
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();

    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError(
        trimmed.length === 0
          ? "Enter your email address to receive a sign-in link."
          : "That doesn't look like an email address. Check for typos and try again.",
      );
      inputRef.current?.focus();
      return;
    }

    setFieldError(null);
    setSendError(null);
    setState("sending");
    try {
      await sendMagicLink(trimmed);
      setState("sent");
      // Move focus so screen readers land on the confirmation.
      requestAnimationFrame(() => sentHeadingRef.current?.focus());
    } catch {
      setState("idle");
      setSendError(
        "The link couldn't be sent. Check your connection and try again.",
      );
    }
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center" aria-live="polite">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className="mb-1 text-accent"
        >
          <rect
            x="5"
            y="9"
            width="26"
            height="18"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M6.5 11.5 18 20l11.5-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h2
          ref={sentHeadingRef}
          tabIndex={-1}
          className="text-lg text-foreground outline-none"
        >
          Check your inbox
        </h2>
        <p className="text-sm text-muted">
          A sign-in link is on its way to{" "}
          <span className="font-medium text-foreground">{email.trim()}</span>. It stays
          valid for 10 minutes and works once.
        </p>
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setSendError(null);
          }}
          className="mt-2 text-sm text-accent underline-offset-4 transition-[color] duration-[var(--duration-ui)] ease-out-quint hover:text-accent-strong hover:underline focus-visible:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const sending = state === "sending";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-muted">
          Email
        </label>
        <input
          ref={inputRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          disabled={sending}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError(null);
          }}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "email-error" : undefined}
          placeholder="you@example.com"
          className="h-11 w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-3.5 text-base text-foreground transition-[border-color,box-shadow] duration-(--duration-ui) ease-out-quint placeholder:text-faint focus:border-(--input-border-focus) focus:ring-4 focus:ring-accent/15 focus:outline-none disabled:opacity-60 aria-invalid:border-danger/70 aria-invalid:focus:ring-danger/10"
        />
        {fieldError ? (
          <p id="email-error" role="alert" className="text-sm text-danger">
            {fieldError}
          </p>
        ) : null}
      </div>

      {sendError ? (
        <p role="alert" className="text-sm text-danger">
          {sendError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#e4e7ff] text-base font-medium text-[#0d0e1c] transition-[transform,background-color,box-shadow] duration-(--duration-press) ease-out-quint hover:bg-white hover:shadow-[0_0_28px_rgba(167,171,255,0.3)] focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none active:scale-[0.97] disabled:cursor-default disabled:opacity-70 disabled:hover:bg-[#e4e7ff] disabled:hover:shadow-none disabled:active:scale-100"
      >
        {sending ? (
          <>
            <Spinner />
            Sending link…
          </>
        ) : (
          "Send magic link"
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
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
