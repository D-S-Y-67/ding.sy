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

/** Shared light direction for planet shading — matches the brightest nebula
 * corner so the whole scene reads as lit from one place. */
export const LIGHT_DIR = { x: -0.5, y: -0.62 } as const;

/**
 * Planets, painted back-to-front. Positions/radii are viewport fractions
 * (radius against the smaller dimension); each is pre-rendered once per
 * resize and only blitted per frame. Motion is a slow Lissajous bob so
 * compositions never drift apart.
 */
export const PLANETS = [
  {
    id: "halcyon",
    cx: 0.13,
    cy: 0.82,
    radius: 0.21,
    alpha: 0.9,
    // The giant stays put: at this scale motion reads as a glitch, and a
    // static sprite lets the backdrop cache repaint only the small worlds.
    bob: { amp: 0, period: 110 },
    palette: {
      lit: "#93a7c8",
      mid: "#46567a",
      shadow: "#0d1322",
      atmosphere: "rgba(150, 174, 224, 0.5)",
    },
    bands: [
      { y: -0.55, h: 0.16, color: "rgba(214, 197, 171, 0.17)" },
      { y: -0.28, h: 0.09, color: "rgba(255, 255, 255, 0.08)" },
      { y: -0.04, h: 0.18, color: "rgba(196, 175, 148, 0.19)" },
      { y: 0.22, h: 0.11, color: "rgba(255, 255, 255, 0.07)" },
      { y: 0.46, h: 0.2, color: "rgba(158, 172, 204, 0.15)" },
    ],
    ring: { tilt: -0.31, inner: 1.38, outer: 2.1, flatten: 0.26, rgb: [196, 205, 228] as const },
  },
  {
    id: "ember",
    cx: 0.87,
    cy: 0.16,
    radius: 0.052,
    alpha: 0.85,
    bob: { amp: 5, period: 80 },
    palette: {
      lit: "#d9a48e",
      mid: "#8a584c",
      shadow: "#200f12",
      atmosphere: "rgba(222, 168, 140, 0.35)",
    },
    bands: [
      { y: -0.2, h: 0.3, color: "rgba(240, 205, 180, 0.12)" },
      { y: 0.35, h: 0.25, color: "rgba(120, 70, 60, 0.16)" },
    ],
    ring: null,
  },
  {
    id: "veil",
    cx: 0.07,
    cy: 0.26,
    radius: 0.03,
    alpha: 0.75,
    bob: { amp: 4, period: 65 },
    palette: {
      lit: "#a4c6cb",
      mid: "#547680",
      shadow: "#0e1a20",
      atmosphere: "rgba(160, 205, 210, 0.3)",
    },
    bands: [],
    ring: null,
  },
] as const;

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
