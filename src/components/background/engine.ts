import { ENGINE } from "./config";
import { Nebula } from "./nebula";
import { Planets, type PlanetPlacement } from "./planets";
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
  private planets = new Planets();
  private starfield = new Starfield();
  private shootingStars = new ShootingStars();
  private spaceship = new Spaceship();

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private reducedMotion = false;

  /** Nebula + planets, cached; only the small dirty rectangle around a
   * planet that moved a whole pixel is ever repainted. */
  private backdrop: HTMLCanvasElement | null = null;
  private prevPlacements: PlanetPlacement[] | null = null;

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
    this.planets.resize(this.viewport, this.dpr);

    const backdrop = document.createElement("canvas");
    backdrop.width = this.canvas.width;
    backdrop.height = this.canvas.height;
    this.backdrop = backdrop;
    this.prevPlacements = null;

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
    this.planets.update(dt, motion);
    if (motion) {
      this.shootingStars.update(dt, this.viewport);
      this.spaceship.update(dt, this.viewport);
    }

    this.refreshBackdrop();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.backdrop) {
      ctx.drawImage(this.backdrop, 0, 0, this.viewport.width, this.viewport.height);
    }
    // Stars render over the backdrop but skip planet discs, so planets read
    // as nearer than the field; meteors and ships stay in the foreground.
    this.starfield.draw(ctx, this.viewport, this.planets.discs());
    if (motion) {
      this.shootingStars.draw(ctx);
      this.spaceship.draw(ctx);
    }
  }

  private refreshBackdrop(): void {
    if (!this.backdrop) return;
    const ctx = this.backdrop.getContext("2d");
    if (!ctx) return;
    const placements = this.planets.placements();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (!this.prevPlacements || this.prevPlacements.length !== placements.length) {
      // First paint (or resize): draw everything once.
      this.nebula.draw(ctx, this.viewport);
      this.planets.drawInto(ctx);
    } else {
      for (let i = 0; i < placements.length; i++) {
        const prev = this.prevPlacements[i] as PlanetPlacement;
        const next = placements[i] as PlanetPlacement;
        if (prev.x === next.x && prev.y === next.y) continue;
        // Repair the union of old and new sprite bounds, then restamp.
        const pad = 2;
        const x = Math.min(prev.x, next.x) - next.size / 2 - pad;
        const y = Math.min(prev.y, next.y) - next.size / 2 - pad;
        const w = Math.abs(next.x - prev.x) + next.size + pad * 2;
        const h = Math.abs(next.y - prev.y) + next.size + pad * 2;
        this.nebula.drawRegion(ctx, x, y, w, h);
        ctx.globalAlpha = next.alpha;
        ctx.drawImage(next.sprite, next.x - next.size / 2, next.y - next.size / 2, next.size, next.size);
        ctx.globalAlpha = 1;
      }
    }
    this.prevPlacements = placements;
  }
}
