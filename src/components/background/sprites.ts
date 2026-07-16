/**
 * Pre-rendered sprites. Drawing a radial gradient per star per frame is far
 * too slow; instead each tint is rasterised once into a small offscreen
 * canvas and stars are drawn with drawImage + globalAlpha.
 */

const SPRITE_SIZE = 32;

export function createStarSprite(tint: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const half = SPRITE_SIZE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, tint);
  gradient.addColorStop(0.25, tint);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return canvas;
}

/** Soft round glow used for shooting-star heads and the ship engine. */
export function createGlowSprite(rgb: readonly [number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE * 2;
  canvas.height = SPRITE_SIZE * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const [r, g, b] = rgb;
  const half = SPRITE_SIZE;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.25)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE_SIZE * 2, SPRITE_SIZE * 2);
  return canvas;
}
