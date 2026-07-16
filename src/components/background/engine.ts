import { ENGINE } from "./config";
import { Nebula } from "./nebula";
import { ShootingStars } from "./shooting-stars";
import { Spaceship } from "./spaceship";
import { Starfield } from "./starfield";
import type { Viewport } from "./utils";

/**
 * Owns the canvas lifecycle: DPR-aware sizing, the requestAnimationFrame
 * loop with delta-time movement, pausing while the tab is hidden, and the
 * prefers-reduced-motion mode (static field, opacity twinkle only).
 *
 * Deliberately framework-free — the React component only calls start/stop.
 */
export class SpaceEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private viewport: Viewport = { width: 0, height: 0 };
  private dpr = 1;

  private nebula = new Nebula();
  private starfield = new Starfield();
  private shootingStars = new ShootingStars();
  private spaceship = new Spaceship();

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private reducedMotion = false;

  private motionQuery: MediaQueryList | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  start(): void {
    if (!this.ctx) return;

    this.shootingStars.init();
    this.spaceship.init();

    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionQuery.matches;
    this.motionQuery.addEventListener("change", this.onMotionPreferenceChange);

    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.resize();
    this.running = true;
    this.resume();
  }

  stop(): void {
    this.running = false;
    this.pause();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.motionQuery?.removeEventListener("change", this.onMotionPreferenceChange);
  }

  private onResize = (): void => {
    this.resize();
  };

  private onVisibilityChange = (): void => {
    // Pause the loop entirely while hidden; on return, resume() clears
    // lastTime so the first frame back gets a sane delta instead of the
    // whole hidden duration.
    if (document.hidden) this.pause();
    else if (this.running) this.resume();
  };

  private onMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches;
  };

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, ENGINE.maxDpr);
    this.viewport = { width, height };

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.nebula.resize(this.viewport, this.dpr);

    const areaRatio = (width * height) / ENGINE.referenceArea;
    const densityScale = Math.min(
      ENGINE.densityScale[1],
      Math.max(ENGINE.densityScale[0], areaRatio),
    );
    this.starfield.populate(densityScale);

    // A resize invalidates the transform; repaint immediately so there is
    // no blank frame even before the next rAF tick.
    this.renderFrame(0);
  }

  private pause(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTime = null;
  }

  private resume(): void {
    if (this.rafId !== null || document.hidden) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    // Delta-time movement: speeds are px/second, so a 120Hz screen and a
    // struggling 40fps phone show the same motion. Clamped so the first
    // frame (lastTime === null) and post-jank frames can't teleport things.
    const dt =
      this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, ENGINE.maxDeltaSeconds);
    this.lastTime = now;

    this.renderFrame(dt);
    this.rafId = requestAnimationFrame(this.tick);
  };

  private renderFrame(dt: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Reduced motion: no drift, no streaks, no ships — the starfield still
    // twinkles gently via opacity, which vestibular guidance permits.
    const motion = !this.reducedMotion;

    this.starfield.update(dt, this.viewport, motion);
    if (motion) {
      this.shootingStars.update(dt, this.viewport);
      this.spaceship.update(dt, this.viewport);
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.nebula.draw(ctx, this.viewport);
    this.starfield.draw(ctx, this.viewport);
    if (motion) {
      this.shootingStars.draw(ctx);
      this.spaceship.draw(ctx);
    }
  }
}
