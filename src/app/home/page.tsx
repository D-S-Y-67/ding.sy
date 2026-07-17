import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SpaceBackground } from "@/components/background/SpaceBackground";
import { Wordmark } from "@/components/brand/Wordmark";
import { auth } from "@/lib/auth";

/**
 * Post-auth placeholder: the end-to-end proof that sessions work. Renders
 * only for authenticated sessions; the real app replaces it later.
 */
export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const { user } = session;

  return (
    <main className="relative flex min-h-svh flex-1 items-center justify-center p-4">
      <SpaceBackground />
      <section
        aria-label="Regmaglypt home"
        className="glass-card animate-card-in flex w-full max-w-sm flex-col items-center gap-4 px-6 py-8 text-center sm:px-8"
      >
        <Wordmark />
        <div>
          <p className="text-lg text-foreground">
            Welcome, {user.name || user.email}
          </p>
          {user.name ? <p className="text-sm text-muted">{user.email}</p> : null}
        </div>
        <p className="text-sm text-muted">
          You&apos;re signed in. This corner of the sky is still under
          construction.
        </p>
        <SignOutButton />
      </section>
    </main>
  );
}
