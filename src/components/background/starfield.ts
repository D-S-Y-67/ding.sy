import { DRIFT_ANGLE, SPACE_COLORS, STAR_LAYERS, TWINKLE } from "./config";
import type { PlanetDisc } from "./planets";
import { createStarSprite } from "./sprites";
import { pick, rand, type Viewport } from "./utils";

interface Star {
  /** Normalised position (0–1) so stars keep their place across resizes. */
  nx: number;
  ny: number;
  radius: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  sprite: HTMLCanvasElement;
}

interface Layer {
  stars: Star[];
  /** Drift offset in CSS pixels, wrapped modulo the viewport. */
  offsetX: number;
  offsetY: number;
  driftX: number;
  driftY: number;
}

function occludedBy(discs: PlanetDisc[], x: number, y: number): boolean {
  for (const disc of discs) {
    const dx = x - disc.x;
    const dy = y - disc.y;
    const reach = disc.radius * 1.02;
    if (dx * dx + dy * dy < reach * reach) return true;
  }
  return false;
}

/**
 * Two–three parallax layers of pre-rendered star sprites. Twinkle is a
 * per-star sine on opacity; drift is a slow shared offset per layer so the
 * whole field moves together — motion felt more than seen.
 */
export class Starfield {
  private layers: Layer[] = [];
  private elapsed = 0;

  /** @param densityScale 0.4–1, shrinks star counts on small viewports. */
  populate(densityScale: number): void {
    const sprites = SPACE_COLORS.starTints.map(createStarSprite);
    this.layers = STAR_LAYERS.map((spec) => {
      const count = Math.round(spec.count * densityScale);
      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          nx: Math.random(),
          ny: Math.random(),
          radius: rand(spec.radius[0], spec.radius[1]),
          baseAlpha: rand(spec.alpha[0], spec.alpha[1]),
          twinklePhase: rand(0, Math.PI * 2),
          twinkleSpeed: rand(TWINKLE.speed[0], TWINKLE.speed[1]) * Math.PI * 2,
          // Distant stars skew white/cool; the warm tint stays rare.
          sprite: Math.random() < 0.85 ? (sprites[0] as HTMLCanvasElement) : pick(sprites),
        });
      }
      return {
        stars,
        offsetX: 0,
        offsetY: 0,
        driftX: Math.cos(DRIFT_ANGLE) * spec.drift,
        driftY: Math.sin(DRIFT_ANGLE) * spec.drift,
      };
    });
  }

  update(dt: number, viewport: Viewport, motionEnabled: boolean): void {
    this.elapsed += dt;
    if (!motionEnabled) return;
    for (const layer of this.layers) {
      layer.offsetX = (layer.offsetX + layer.driftX * dt) % viewport.width;
      layer.offsetY = (layer.offsetY + layer.driftY * dt) % viewport.height;
    }
  }

  draw(ctx: CanvasRenderingContext2D, viewport: Viewport, occluders: PlanetDisc[] = []): void {
    const { width, height } = viewport;
    const t = this.elapsed;
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        // Wrap into view instead of respawning: ((v % m) + m) % m keeps the
        // result positive when drift is negative.
        const x = (((star.nx * width + layer.offsetX) % width) + width) % width;
        const y = (((star.ny * height + layer.offsetY) % height) + height) % height;
        // Stars are behind planets: skip any star drifting across a disc
        // instead of paying a per-frame compositing layer for occlusion.
        if (occludedBy(occluders, x, y)) continue;
        const twinkle = 1 - TWINKLE.depth * (0.5 + 0.5 * Math.sin(star.twinklePhase + t * star.twinkleSpeed));
        ctx.globalAlpha = star.baseAlpha * twinkle;
        const size = star.radius * 6; // sprite has a soft falloff; scale up so the core reads at `radius`
        ctx.drawImage(star.sprite, x - size / 2, y - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }
}
