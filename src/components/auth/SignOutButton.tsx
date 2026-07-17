"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void signOut()}
      className="mt-2 h-10 rounded-lg border border-white/25 px-5 text-sm font-medium text-foreground transition-[transform,background-color,border-color] duration-(--duration-press) ease-out-quint hover:border-white/40 hover:bg-white/5 focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none active:scale-[0.97] disabled:cursor-default disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
