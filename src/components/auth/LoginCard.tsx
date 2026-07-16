import { Wordmark } from "@/components/brand/Wordmark";
import { MagicLinkForm } from "./MagicLinkForm";
import { ProviderButtons } from "./ProviderButtons";

/**
 * The login card. Entrance is staggered per block via --rise-delay; the
 * animation is decorative only — elements are interactive from first paint.
 */
function riseDelay(ms: number): React.CSSProperties {
  return { "--rise-delay": `${ms}ms` } as React.CSSProperties;
}

export function LoginCard({ errorMessage }: { errorMessage?: string | null }) {
  return (
    <section
      aria-label="Sign in to Regmaglypt"
      className="glass-card animate-card-in w-full max-w-sm px-6 py-8 sm:px-8"
    >
      <header className="animate-rise flex flex-col items-center gap-2 text-center" style={riseDelay(40)}>
        <h1>
          <Wordmark />
        </h1>
        <p className="text-sm text-muted">
          A shooting star&apos;s fingerprint. Sign in, or create your account by
          signing in for the first time.
        </p>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="animate-rise mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
          style={riseDelay(70)}
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="animate-rise mt-6" style={riseDelay(100)}>
        <MagicLinkForm />
      </div>

      <div
        className="animate-rise my-5 flex items-center gap-3"
        style={riseDelay(150)}
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs tracking-[0.2em] text-faint uppercase">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="animate-rise" style={riseDelay(200)}>
        <ProviderButtons />
      </div>
    </section>
  );
}
