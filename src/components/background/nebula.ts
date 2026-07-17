import { SPACE_COLORS } from "./config";
import type { Viewport } from "./utils";

/**
 * The deep-space backdrop: a vertical gradient plus 2–3 large radial nebula
 * glows. Expensive to paint, entirely static — so it is rendered once into an
 * offscreen canvas on resize and blitted with a single drawImage per frame.
 */
export class Nebula {
  private layer: HTMLCanvasElement | null = null;
  private dpr = 1;

  resize(viewport: Viewport, dpr: number): void {
    this.dpr = dpr;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width * dpr));
    canvas.height = Math.max(1, Math.round(viewport.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const sky = ctx.createLinearGradient(0, 0, 0, viewport.height);
    sky.addColorStop(0, SPACE_COLORS.skyTop);
    sky.addColorStop(1, SPACE_COLORS.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    const maxSide = Math.max(viewport.width, viewport.height);
    for (const glow of SPACE_COLORS.nebulae) {
      const cx = glow.cx * viewport.width;
      const cy = glow.cy * viewport.height;
      const radius = glow.r * maxSide;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, glow.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    this.layer = canvas;
  }

  draw(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
    if (!this.layer) return;
    ctx.drawImage(this.layer, 0, 0, viewport.width, viewport.height);
  }

  /** Restores just one region of sky — used for dirty-rect backdrop repair. */
  drawRegion(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.layer || w <= 0 || h <= 0) return;
    ctx.drawImage(this.layer, x * this.dpr, y * this.dpr, w * this.dpr, h * this.dpr, x, y, w, h);
  }
}
