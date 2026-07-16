import { SHOOTING_STARS } from "./config";
import { createGlowSprite } from "./sprites";
import { rand, type Viewport } from "./utils";

interface Streak {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
  headRadius: number;
}

/**
 * Object-pooled shooting stars: a fixed array of streak slots is allocated
 * once and recycled, so spawning never allocates during the render loop.
 */
export class ShootingStars {
  private pool: Streak[];
  private nextSpawn: number;
  private glow: HTMLCanvasElement | null = null;

  constructor() {
    this.pool = Array.from({ length: SHOOTING_STARS.poolSize }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: 0,
      life: 0,
      maxLife: 0,
      headRadius: 0,
    }));
    this.nextSpawn = rand(SHOOTING_STARS.interval[0], SHOOTING_STARS.interval[1]);
  }

  init(): void {
    this.glow = createGlowSprite([255, 255, 255]);
  }

  update(dt: number, viewport: Viewport): void {
    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      this.spawn(viewport);
      this.nextSpawn = rand(SHOOTING_STARS.interval[0], SHOOTING_STARS.interval[1]);
    }
    for (const streak of this.pool) {
      if (!streak.active) continue;
      streak.life += dt;
      streak.x += streak.vx * dt;
      streak.y += streak.vy * dt;
      const offscreen =
        streak.x < -streak.length ||
        streak.x > viewport.width + streak.length ||
        streak.y > viewport.height + streak.length;
      if (streak.life >= streak.maxLife || offscreen) {
        streak.active = false;
      }
    }
  }

  private spawn(viewport: Viewport): void {
    const slot = this.pool.find((s) => !s.active);
    if (!slot) return;

    const angle = rand(SHOOTING_STARS.angle[0], SHOOTING_STARS.angle[1]);
    const speed = rand(SHOOTING_STARS.speed[0], SHOOTING_STARS.speed[1]);
    const leftToRight = Math.random() < 0.5;
    const dirX = leftToRight ? Math.cos(angle) : -Math.cos(angle);

    slot.active = true;
    // Spawn in the upper 60% and biased toward the entering edge so most of
    // the flight happens on screen.
    slot.x = viewport.width * (leftToRight ? rand(-0.1, 0.6) : rand(0.4, 1.1));
    slot.y = viewport.height * rand(-0.05, 0.55);
    slot.vx = dirX * speed;
    slot.vy = Math.sin(angle) * speed;
    slot.length = rand(SHOOTING_STARS.length[0], SHOOTING_STARS.length[1]);
    slot.life = 0;
    slot.maxLife = rand(SHOOTING_STARS.life[0], SHOOTING_STARS.life[1]);
    slot.headRadius = rand(SHOOTING_STARS.headRadius[0], SHOOTING_STARS.headRadius[1]);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const streak of this.pool) {
      if (!streak.active) continue;

      // Ease in fast, fade out toward the end of life.
      const progress = streak.life / streak.maxLife;
      const alpha = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;

      const speed = Math.hypot(streak.vx, streak.vy);
      const tailX = streak.x - (streak.vx / speed) * streak.length;
      const tailY = streak.y - (streak.vy / speed) * streak.length;

      const gradient = ctx.createLinearGradient(streak.x, streak.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.85 * alpha})`);
      gradient.addColorStop(0.3, `rgba(190, 208, 255, ${0.35 * alpha})`);
      gradient.addColorStop(1, "rgba(190, 208, 255, 0)");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = streak.headRadius;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(streak.x, streak.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      if (this.glow) {
        const glowSize = streak.headRadius * 14;
        ctx.globalAlpha = 0.55 * alpha;
        ctx.drawImage(this.glow, streak.x - glowSize / 2, streak.y - glowSize / 2, glowSize, glowSize);
        ctx.globalAlpha = 1;
      }
    }
  }
}
