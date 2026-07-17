/**
 * Tuning constants for the space background. Everything visual lives here so
 * the feel can be adjusted without touching the render code.
 */

export const SPACE_COLORS = {
  /** Base sky, top to bottom — true black fading to a breath of blue. */
  skyTop: "#000000",
  skyBottom: "#04050b",
  /** Large soft nebula glows, pre-rendered once per resize. Kept faint so
   * the sky reads black first, colour second. */
  nebulae: [
    { color: "rgba(43, 52, 110, 0.1)", cx: 0.22, cy: 0.24, r: 0.62 },
    { color: "rgba(84, 51, 128, 0.08)", cx: 0.78, cy: 0.62, r: 0.7 },
    { color: "rgba(32, 78, 108, 0.06)", cx: 0.55, cy: 0.95, r: 0.55 },
  ],
  /** Star tints — mostly white, a few cool and warm outliers. */
  starTints: ["#ffffff", "#cfdcff", "#ffe8cf"] as const,
} as const;

/** Parallax layers, back to front. Counts are for a ~1440×900 viewport and
 * are scaled down by area (see engine) with a hard floor for small screens. */
export const STAR_LAYERS = [
  { count: 150, radius: [0.4, 0.9], alpha: [0.25, 0.55], drift: 1.6 },
  { count: 90, radius: [0.7, 1.3], alpha: [0.35, 0.75], drift: 3.2 },
  { count: 45, radius: [1.1, 1.9], alpha: [0.5, 1.0], drift: 5.5 },
] as const;

/** Direction all layers drift, radians. Slightly below horizontal so the sky
 * appears to rotate rather than scroll. */
export const DRIFT_ANGLE = Math.PI * 0.94;

export const TWINKLE = {
  /** Cycles per second; each star gets a random speed in this range. */
  speed: [0.1, 0.45],
  /** Fraction of base alpha that oscillates. */
  depth: 0.3,
} as const;

export const SHOOTING_STARS = {
  poolSize: 4,
  /** Seconds between spawns. */
  interval: [4, 12],
  /** Pixels per second. */
  speed: [420, 880],
  /** Trail length in pixels. */
  length: [90, 220],
  /** Angle from horizontal, radians (always descending). */
  angle: [Math.PI * 0.12, Math.PI * 0.3],
  life: [0.7, 1.3],
  headRadius: [1.2, 2.1],
} as const;

export const SPACESHIP = {
  /** Seconds between crossings. */
  interval: [60, 150],
  speed: [38, 70],
  /** Overall silhouette alpha — almost subliminal. */
  alpha: 0.4,
  scale: [0.7, 1.1],
  bobAmplitude: 5,
  bobFrequency: 0.35,
  /** Vertical band of the viewport the ship may cross (fractions). */
  band: [0.12, 0.55],
} as const;

export const ENGINE = {
  /** Cap devicePixelRatio: beyond 2 the cost outweighs visible sharpness on
   * the phones this must stay smooth on. */
  maxDpr: 2,
  /** Clamp delta-time so a background tab resume doesn't teleport particles. */
  maxDeltaSeconds: 0.05,
  /** Star counts scale with viewport area between these bounds. */
  densityScale: [0.4, 1],
  referenceArea: 1440 * 900,
} as const;
