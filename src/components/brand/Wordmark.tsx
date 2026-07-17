import { GlyphMark } from "./GlyphMark";

/**
 * Full wordmark for the card and headlines. Tight spots (favicon, future
 * mobile header) use GlyphMark alone instead of shortening the name.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <GlyphMark size={26} className="text-foreground/80" />
      <span className="font-display text-2xl tracking-[0.04em] text-foreground">
        Regmaglypt
      </span>
    </span>
  );
}
