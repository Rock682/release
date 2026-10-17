// Pre-rendered star images. Drawing a small cached canvas is far cheaper than
// building a radial gradient for every star on every frame.

export type RGB = [number, number, number];

export const STAR_COLORS: RGB[] = [
  [255, 255, 255], // white
  [255, 244, 228], // warm white
  [214, 228, 255], // cool white
  [168, 204, 255], // blue
  [255, 206, 150], // orange giant
  [255, 214, 214], // faint red
];

export const STAR_SIZES = [0.45, 0.7, 1.0, 1.35, 1.8, 2.4];

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.ceil(size));
  return [c, c.getContext('2d')!];
}

/** A star dot with a soft glow. Returned canvas is drawn centred at the star. */
export function starSprite(radius: number, rgb: RGB, dpr: number): HTMLCanvasElement {
  const glow = radius * (radius > 1.2 ? 5 : 3.2);
  const px = glow * 2 * dpr;
  const [c, g] = makeCanvas(px);
  const m = c.width / 2;
  const [r, gg, b] = rgb;
  const grad = g.createRadialGradient(m, m, 0, m, m, m);
  const core = radius / glow;
  grad.addColorStop(0, `rgba(255,255,255,1)`);
  grad.addColorStop(core * 0.55, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(core, `rgba(${r},${gg},${b},0.55)`);
  grad.addColorStop(Math.min(0.99, core * 2.2), `rgba(${r},${gg},${b},0.12)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  if (radius >= 1.8) {
    // faint diffraction spikes on the brightest stars
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(${r},${gg},${b},0.35)`;
    g.lineWidth = Math.max(1, dpr * 0.6);
    g.beginPath();
    g.moveTo(m, m - m * 0.95);
    g.lineTo(m, m + m * 0.95);
    g.moveTo(m - m * 0.95, m);
    g.lineTo(m + m * 0.95, m);
    g.stroke();
  }
  return c;
}

/** The warm glow behind a released-mistake star. */
export function goldHalo(dpr: number): HTMLCanvasElement {
  const size = 64 * dpr;
  const [c, g] = makeCanvas(size);
  const m = c.width / 2;
  const grad = g.createRadialGradient(m, m, 0, m, m, m);
  grad.addColorStop(0, 'rgba(255,246,220,0.95)');
  grad.addColorStop(0.08, 'rgba(250,224,170,0.75)');
  grad.addColorStop(0.22, 'rgba(225,185,110,0.28)');
  grad.addColorStop(0.5, 'rgba(200,160,90,0.08)');
  grad.addColorStop(1, 'rgba(200,160,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Soft round light used for comet trails, flares and the galaxy's arms. */
export function softDot(rgb: RGB, dpr: number, size = 32): HTMLCanvasElement {
  const [c, g] = makeCanvas(size * dpr);
  const m = c.width / 2;
  const [r, gg, b] = rgb;
  const grad = g.createRadialGradient(m, m, 0, m, m, m);
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(0.35, `rgba(${r},${gg},${b},0.4)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Tiles of film grain, cycled each frame. */
export function grainTiles(count = 4, size = 160): HTMLCanvasElement[] {
  const tiles: HTMLCanvasElement[] = [];
  for (let t = 0; t < count; t++) {
    const [c, g] = makeCanvas(size);
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = (Math.random() * 40) | 0;
    }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}
