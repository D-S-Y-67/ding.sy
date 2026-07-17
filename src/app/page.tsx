import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { SpaceBackground } from "@/components/background/SpaceBackground";
import { auth } from "@/lib/auth";
import { describeAuthError } from "@/lib/auth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/home");
  }

  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-svh flex-1 items-center justify-center p-4">
      <SpaceBackground />
      <LoginCard errorMessage={describeAuthError(error)} />
    </main>
  );
}
