/**
 * The Regmaglypt mark: three broken concentric rings, like a thumbprint
 * pressed into molten metal. Each ring's gap sits at a different angle so
 * the whorl reads organic rather than geometric.
 */
export function GlyphMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        {/* Innermost dent, gap facing upper-left. */}
        <path d="M 12.02 15.65 A 4 4 0 1 1 13.71 19.28" />
        {/* Middle ring, gap swung to the top. */}
        <path d="M 17.17 7.08 A 9 9 0 1 1 9.36 9.92" />
        {/* Outer ring, gap opening to the right. */}
        <path d="M 26.96 22.99 A 13 13 0 1 1 28.69 13.19" />
      </g>
    </svg>
  );
}
