/**
 * The share card: a high-resolution image of the person's star in its own
 * galaxy, drawn fresh for every star (the star id seeds the sky, so no two
 * cards look the same). It never contains the person's words.
 */

export type CardFormat = 'story' | 'square';

export interface CardOptions {
  format: CardFormat;
  line: string;
  seed: string;
  releasedAt: number;
}

export const CARD_LINES = [
  'I let something go tonight.',
  'I’m lighter tonight.',
  'Some things are meant to become stars.',
];

/** The site address shown on the card and shared with it (empty until the site is online). */
export function siteUrl(): string {
  const { hostname, origin } = window.location;
  const local = hostname === 'localhost' || hostname.startsWith('127.') || hostname.endsWith('.local');
  const preview = hostname.includes('claude') || hostname.includes('usercontent');
  return local || preview ? '' : origin;
}

/** A short, stable star number for the card, from the star id. */
export function starNumber(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return String((h >>> 0) % 10000).padStart(4, '0');
}

function rng(seed: string) {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (Math.imul(a, 31) + seed.charCodeAt(i)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softDot(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.35, `rgba(${r},${g},${b},.4)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return c;
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (g.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

const spaced = (s: string) => s.split('').join(' ');

export async function renderCard(o: CardOptions): Promise<Blob> {
  const W = 1080;
  const H = o.format === 'story' ? 1920 : 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rand = rng(o.seed);
  const story = o.format === 'story';
  const sx = W / 2;
  const sy = story ? H * 0.38 : H * 0.4;

  try {
    await Promise.all([
      document.fonts.load("italic 300 80px 'Cormorant Garamond'"),
      document.fonts.load("28px 'Space Mono'"),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  // deep space
  g.fillStyle = '#02030a';
  g.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, stops: [number, string][]) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([t, col]) => gr.addColorStop(t, col));
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  };
  blob(W * 0.92, H * 0.04, W * 0.8, [[0, 'rgba(36,66,205,.30)'], [0.5, 'rgba(14,30,110,.10)'], [1, 'rgba(0,0,0,0)']]);
  blob(W * 0.05, H * 0.12, W * 0.75, [[0, 'rgba(110,24,170,.26)'], [0.5, 'rgba(46,10,80,.08)'], [1, 'rgba(0,0,0,0)']]);
  blob(W * 0.5, H * 1.05, W * 1.0, [[0, 'rgba(245,100,34,.55)'], [0.3, 'rgba(196,58,16,.28)'], [0.6, 'rgba(100,24,8,.10)'], [1, 'rgba(0,0,0,0)']]);

  // the star's own galaxy: spiral arms around it
  const blue = softDot(205, 215, 255);
  const warm = softDot(255, 205, 160);
  const pink = softDot(255, 120, 150);
  const R = W * 0.62;
  const twist = rand() * Math.PI * 2;
  g.save();
  g.translate(sx, sy);
  g.rotate(-0.4 + rand() * 0.3);
  g.scale(1, 0.62);
  g.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 520; i++) {
      const t = rand();
      const r = 40 + t * R;
      const th = twist + arm * Math.PI + Math.log(r / 30 + 1) * 2.3 + (rand() - 0.5) * 0.45;
      const s = 30 + rand() * 90 * (1 - t * 0.5);
      g.globalAlpha = (0.05 + rand() * 0.07) * (1 - t * 0.75);
      g.drawImage(t < 0.25 && rand() < 0.5 ? warm : blue, Math.cos(th) * r - s / 2, Math.sin(th) * r - s / 2, s, s);
      if (rand() < 0.04) {
        g.globalAlpha = 0.3;
        g.drawImage(pink, Math.cos(th) * r - 8, Math.sin(th) * r - 8, 16, 16);
      }
      if (rand() < 0.5) {
        g.globalAlpha = 0.5 + rand() * 0.5;
        g.fillStyle = '#fff';
        g.fillRect(Math.cos(th) * r + (rand() - 0.5) * 30, Math.sin(th) * r + (rand() - 0.5) * 30, 1.6, 1.6);
      }
    }
  }
  g.restore();
  g.globalCompositeOperation = 'source-over';

  // field of stars
  const tints = ['#ffffff', '#ffffff', '#ffffff', '#fff4e4', '#d6e4ff', '#a8ccff', '#ffce96'];
  for (let i = 0; i < (story ? 2200 : 1400); i++) {
    const x = rand() * W;
    const y = rand() * H;
    const big = rand() < 0.06;
    const r = big ? 1.6 + rand() * 1.8 : 0.5 + rand() * 1.1;
    g.globalAlpha = 0.35 + rand() * 0.65;
    g.fillStyle = tints[(rand() * tints.length) | 0];
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    if (big) {
      g.globalAlpha *= 0.35;
      g.drawImage(blue, x - r * 6, y - r * 6, r * 12, r * 12);
      if (rand() < 0.4) {
        g.strokeStyle = 'rgba(255,255,255,.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x - r * 6, y);
        g.lineTo(x + r * 6, y);
        g.moveTo(x, y - r * 6);
        g.lineTo(x, y + r * 6);
        g.stroke();
      }
    }
  }
  g.globalAlpha = 1;

  // the person's star: halo, rings, rays, core
  blob(sx, sy, 380, [[0, 'rgba(255,248,226,.95)'], [0.06, 'rgba(250,225,170,.75)'], [0.2, 'rgba(225,185,110,.28)'], [0.55, 'rgba(200,160,90,.07)'], [1, 'rgba(0,0,0,0)']]);
  [92, 150, 230].forEach((r, i) => {
    g.strokeStyle = `rgba(232,196,124,${0.75 - i * 0.22})`;
    g.lineWidth = 2.2 - i * 0.5;
    g.beginPath();
    g.arc(sx, sy, r, 0, Math.PI * 2);
    g.stroke();
  });
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const len = i % 2 === 0 ? 300 : 120;
    const gr = g.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    gr.addColorStop(0, 'rgba(255,250,228,.95)');
    gr.addColorStop(1, 'rgba(255,250,228,0)');
    g.strokeStyle = gr;
    g.lineWidth = i % 2 === 0 ? 2.4 : 1.4;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#fffdf2';
  g.shadowColor = 'rgba(255,236,190,1)';
  g.shadowBlur = 40;
  g.beginPath();
  g.arc(sx, sy, 13, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;

  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  // words
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#C8A96E';
  g.font = "28px 'Space Mono', monospace";
  g.fillText(spaced('THE RELEASE'), W / 2, story ? 150 : 96);

  const lineSize = story ? 88 : 70;
  g.font = `italic 300 ${lineSize}px 'Cormorant Garamond', Georgia, serif`;
  const lines = wrap(g, o.line, W - 180);
  let y = story ? H * 0.66 : H * 0.735;
  if (!story) y -= ((lines.length - 1) * lineSize * 1.12) / 2;
  g.fillStyle = '#F4E2B6';
  g.shadowColor = 'rgba(240,190,100,.55)';
  g.shadowBlur = 30;
  for (const l of lines) {
    g.fillText(l, W / 2, y);
    y += lineSize * 1.12;
  }
  g.shadowBlur = 0;

  const date = new Date(o.releasedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  g.fillStyle = 'rgba(232,201,142,.85)';
  g.font = `${story ? 26 : 22}px 'Space Mono', monospace`;
  g.fillText(spaced(`STAR № ${starNumber(o.seed)}  ·  ${date}`), W / 2, y + (story ? 30 : 16));

  // call to action pill
  const site = siteUrl().replace(/^https?:\/\//, '');
  const cta = site ? `LET YOURS GO  ·  ${site}` : 'LET YOURS GO';
  g.font = `${story ? 28 : 24}px 'Space Mono', monospace`;
  const label = spaced(cta);
  const pw = Math.min(W - 120, g.measureText(label).width + 90);
  const ph = story ? 84 : 70;
  const px = (W - pw) / 2;
  const py = H - (story ? 230 : 120);
  g.strokeStyle = 'rgba(200,169,110,.8)';
  g.lineWidth = 2;
  g.fillStyle = 'rgba(2,3,10,.55)';
  g.beginPath();
  g.roundRect(px, py, pw, ph, ph / 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#F4E3BC';
  g.textBaseline = 'middle';
  g.fillText(label, W / 2, py + ph / 2 + 1);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}

export function shareText(line: string): string {
  const url = siteUrl();
  return url ? `${line} Let yours go: ${url}` : line;
}

/** Opens the phone's share sheet (WhatsApp, Instagram, TikTok, Snapchat, Facebook…). */
export async function shareImage(blob: Blob, line: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  const file = new File([blob], 'my-star.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return 'unsupported';
  try {
    await nav.share({ files: [file], text: shareText(line) });
    return 'shared';
  } catch {
    return 'cancelled';
  }
}

export function downloadImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-star.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
