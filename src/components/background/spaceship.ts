import { SPACESHIP } from "./config";
import { createGlowSprite } from "./sprites";
import { rand, type Viewport } from "./utils";

/**
 * A rare, distant ship silhouette that crosses the viewport every minute or
 * two — almost subliminal. Drawn as a small vector path (Path2D), never a
 * sprite or emoji, with a faint warm engine glow and a slow vertical bob.
 */
export class Spaceship {
  private active = false;
  private nextCrossing: number;
  private x = 0;
  private baseY = 0;
  private vx = 0;
  private scale = 1;
  private bobPhase = 0;
  private elapsed = 0;
  private hull: Path2D | null = null;
  private canopy: Path2D | null = null;
  private engineGlow: HTMLCanvasElement | null = null;

  constructor() {
    this.nextCrossing = rand(SPACESHIP.interval[0], SPACESHIP.interval[1]);
  }

  init(): void {
    this.engineGlow = createGlowSprite([255, 196, 130]);

    // Hull drawn in local coordinates, nose at +x. A slim teardrop body with
    // a low dorsal fin — enough silhouette to read "ship" at 30px, no more.
    const hull = new Path2D();
    hull.moveTo(18, 0);
    hull.bezierCurveTo(12, -4.5, -6, -5, -14, -2.5);
    hull.lineTo(-17, -7); // dorsal fin, swept back
    hull.lineTo(-19, -1.5);
    hull.bezierCurveTo(-20, 1.5, -12, 4.5, -2, 4.5);
    hull.bezierCurveTo(6, 4.5, 13, 3.5, 18, 0);
    hull.closePath();
    this.hull = hull;

    const canopy = new Path2D();
    canopy.moveTo(9, -2.2);
    canopy.bezierCurveTo(6, -4.2, 1, -4.2, -2, -2.6);
    canopy.bezierCurveTo(2, -1.6, 6, -1.4, 9, -2.2);
    canopy.closePath();
    this.canopy = canopy;
  }

  update(dt: number, viewport: Viewport): void {
    this.elapsed += dt;
    if (!this.active) {
      this.nextCrossing -= dt;
      if (this.nextCrossing <= 0) this.launch(viewport);
      return;
    }
    this.x += this.vx * dt;
    const margin = 40 * this.scale;
    if ((this.vx > 0 && this.x > viewport.width + margin) || (this.vx < 0 && this.x < -margin)) {
      this.active = false;
      this.nextCrossing = rand(SPACESHIP.interval[0], SPACESHIP.interval[1]);
    }
  }

  private launch(viewport: Viewport): void {
    const leftToRight = Math.random() < 0.5;
    this.active = true;
    this.scale = rand(SPACESHIP.scale[0], SPACESHIP.scale[1]);
    this.vx = rand(SPACESHIP.speed[0], SPACESHIP.speed[1]) * (leftToRight ? 1 : -1);
    this.x = leftToRight ? -40 * this.scale : viewport.width + 40 * this.scale;
    this.baseY = viewport.height * rand(SPACESHIP.band[0], SPACESHIP.band[1]);
    this.bobPhase = rand(0, Math.PI * 2);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active || !this.hull || !this.canopy) return;

    const bob = Math.sin(this.bobPhase + this.elapsed * SPACESHIP.bobFrequency * Math.PI * 2) * SPACESHIP.bobAmplitude;
    const y = this.baseY + bob;
    const facingLeft = this.vx < 0;

    ctx.save();
    ctx.translate(this.x, y);
    ctx.scale(facingLeft ? -this.scale : this.scale, this.scale);

    if (this.engineGlow) {
      // Engine glow sits behind the tail; drawn pre-transform-scale so it
      // flips with the hull.
      const glowSize = 26;
      ctx.globalAlpha = SPACESHIP.alpha * 0.7;
      ctx.drawImage(this.engineGlow, -19 - glowSize / 2, -glowSize / 2, glowSize, glowSize);
    }

    ctx.globalAlpha = SPACESHIP.alpha;
    ctx.fillStyle = "rgba(148, 163, 205, 0.9)";
    ctx.fill(this.hull);
    ctx.globalAlpha = SPACESHIP.alpha * 0.8;
    ctx.fillStyle = "rgba(220, 234, 255, 0.9)";
    ctx.fill(this.canopy);

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
