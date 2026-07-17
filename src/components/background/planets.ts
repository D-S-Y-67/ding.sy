import { LIGHT_DIR, PLANETS } from "./config";
import { rand, type Viewport } from "./utils";

type PlanetSpec = (typeof PLANETS)[number];

interface RenderedPlanet {
  spec: PlanetSpec;
  sprite: HTMLCanvasElement;
  /** Sprite square size in CSS pixels. */
  size: number;
  /** Sphere radius in CSS pixels (rings excluded). */
  radius: number;
  baseX: number;
  baseY: number;
  bobPhaseX: number;
  bobPhaseY: number;
}

export interface PlanetDisc {
  x: number;
  y: number;
  radius: number;
}

export interface PlanetPlacement {
  x: number;
  y: number;
  size: number;
  alpha: number;
  sprite: HTMLCanvasElement;
}

/**
 * Realistically shaded planets. Spheres (offset-light gradient, cloud
 * bands, terminator shadow, atmosphere rim) and rings are expensive to
 * paint, so each planet is rasterised once per resize. The bob moves less
 * than half a pixel per second, so positions are rounded to whole pixels:
 * the engine repaints its cached backdrop only when `positionsKey`
 * changes (every second or two), never per frame.
 */
export class Planets {
  private rendered: RenderedPlanet[] = [];
  private elapsed = 0;

  resize(viewport: Viewport, dpr: number): void {
    const minSide = Math.min(viewport.width, viewport.height);
    this.rendered = PLANETS.map((spec) => {
      const radius = spec.radius * minSide;
      const { sprite, size } = renderPlanetSprite(spec, radius, dpr);
      return {
        spec,
        sprite,
        size,
        radius,
        baseX: spec.cx * viewport.width,
        baseY: spec.cy * viewport.height,
        bobPhaseX: rand(0, Math.PI * 2),
        bobPhaseY: rand(0, Math.PI * 2),
      };
    });
  }

  update(dt: number, motionEnabled: boolean): void {
    if (motionEnabled) this.elapsed += dt;
  }

  /** Current sphere outlines, for star occlusion. */
  discs(): PlanetDisc[] {
    return this.positions().map(({ planet, x, y }) => ({ x, y, radius: planet.radius }));
  }

  /** Current sprite placements, for the engine's backdrop cache. */
  placements(): PlanetPlacement[] {
    return this.positions().map(({ planet, x, y }) => ({
      x,
      y,
      size: planet.size,
      alpha: planet.spec.alpha,
      sprite: planet.sprite,
    }));
  }

  drawInto(ctx: CanvasRenderingContext2D): void {
    for (const { sprite, x, y, size, alpha } of this.placements()) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  private positions(): Array<{ x: number; y: number; planet: RenderedPlanet }> {
    return this.rendered.map((planet) => {
      const { spec } = planet;
      const omega = (Math.PI * 2) / spec.bob.period;
      // Lissajous bob: x and y run at slightly different rates so the path
      // never reads as a mechanical circle.
      return {
        planet,
        x: Math.round(planet.baseX + Math.sin(planet.bobPhaseX + this.elapsed * omega) * spec.bob.amp),
        y: Math.round(planet.baseY + Math.sin(planet.bobPhaseY + this.elapsed * omega * 1.37) * spec.bob.amp * 0.7),
      };
    });
  }
}

function renderPlanetSprite(
  spec: PlanetSpec,
  radius: number,
  dpr: number,
): { sprite: HTMLCanvasElement; size: number } {
  const reach = spec.ring ? radius * spec.ring.outer : radius;
  const pad = radius * 0.25 + 8;
  const half = reach + pad;
  const size = Math.ceil(half * 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(size * dpr));
  canvas.height = canvas.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { sprite: canvas, size };

  ctx.scale(dpr, dpr);
  ctx.translate(half, half);

  if (spec.ring) drawRingHalf(ctx, radius, spec.ring, "far");
  drawSphere(ctx, radius, spec);
  if (spec.ring) drawRingHalf(ctx, radius, spec.ring, "near");

  return { sprite: canvas, size };
}

function drawSphere(ctx: CanvasRenderingContext2D, r: number, spec: PlanetSpec): void {
  const lx = LIGHT_DIR.x * r * 0.55;
  const ly = LIGHT_DIR.y * r * 0.55;

  // Base sphere: highlight offset toward the shared scene light.
  const base = ctx.createRadialGradient(lx, ly, r * 0.08, 0, 0, r * 1.02);
  base.addColorStop(0, spec.palette.lit);
  base.addColorStop(0.5, spec.palette.mid);
  base.addColorStop(1, spec.palette.shadow);
  ctx.fillStyle = base;
  circle(ctx, r);
  ctx.fill();

  // Cloud/surface bands, clipped to the disc.
  if (spec.bands.length > 0) {
    ctx.save();
    circle(ctx, r);
    ctx.clip();
    for (const band of spec.bands) {
      ctx.fillStyle = band.color;
      ctx.fillRect(-r, band.y * r - (band.h * r) / 2, r * 2, band.h * r);
    }
    ctx.restore();
  }

  // Terminator: one more light-anchored gradient composited onto the disc
  // so the bands fall into shadow with the sphere instead of floating.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const shade = ctx.createRadialGradient(lx, ly, r * 0.2, 0, 0, r * 1.04);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(0.6, "rgba(0, 0, 0, 0.12)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = shade;
  circle(ctx, r);
  ctx.fill();
  ctx.restore();

  // Thin atmosphere rim with a soft halo — only on the lit limb; a glowing
  // outline on the night side would flatten the sphere.
  const lightAngle = Math.atan2(LIGHT_DIR.y, LIGHT_DIR.x);
  ctx.save();
  ctx.strokeStyle = spec.palette.atmosphere;
  ctx.lineWidth = Math.max(0.8, r * 0.018);
  ctx.lineCap = "round";
  ctx.shadowColor = spec.palette.atmosphere;
  ctx.shadowBlur = r * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.995, lightAngle - Math.PI * 0.58, lightAngle + Math.PI * 0.58);
  ctx.stroke();
  ctx.restore();
}

function drawRingHalf(
  ctx: CanvasRenderingContext2D,
  r: number,
  ring: NonNullable<PlanetSpec["ring"]>,
  half: "far" | "near",
): void {
  const [red, green, blue] = ring.rgb;
  const midX = (r * (ring.inner + ring.outer)) / 2;
  const midY = midX * ring.flatten;
  const width = r * (ring.outer - ring.inner);

  ctx.save();
  ctx.rotate(ring.tilt);

  const gradient = ctx.createLinearGradient(-r * ring.outer, 0, r * ring.outer, 0);
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0)`);
  gradient.addColorStop(0.16, `rgba(${red}, ${green}, ${blue}, 0.34)`);
  gradient.addColorStop(0.5, `rgba(${red}, ${green}, ${blue}, 0.13)`);
  gradient.addColorStop(0.84, `rgba(${red}, ${green}, ${blue}, 0.34)`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = width;
  // Canvas y grows downward, so 0→π sweeps the lower (near) arc and π→2π
  // the upper (far) arc that passes behind the sphere.
  ctx.globalAlpha = half === "far" ? 0.55 : 1;
  ctx.beginPath();
  if (half === "near") {
    ctx.ellipse(0, 0, midX, midY, 0, 0, Math.PI);
  } else {
    ctx.ellipse(0, 0, midX, midY, 0, Math.PI, Math.PI * 2);
  }
  ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}

function circle(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
}
