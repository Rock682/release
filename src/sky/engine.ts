import type { SkyStar } from '../data/store';
import { STAR_COLORS, STAR_SIZES, starSprite, goldHalo, softDot, grainTiles } from './sprites';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DustStar {
  r: number; // radius in galaxy space
  th: number; // angle in galaxy space
  w: number; // angular speed (rad/s)
  layer: 0 | 1 | 2;
  sprite: HTMLCanvasElement;
  size: number; // CSS px of sprite
  alpha: number;
  tw: number; // twinkle phase
  tws: number; // twinkle speed
}

type GoldState = 'born' | 'held' | 'rising' | 'live' | 'falling' | 'gone';

/** Ellipse that golden stars orbit on, fitted to the screen (fractions of W/H). */
const ORBIT = { cx: 0.5, cy: 0.51, rx: 0.43, ry: 0.34 };
const U_MIN = 0.14;
const U_MAX = 0.96;
/** Angular speed (rad/s): inner stars turn faster, like a real galaxy. */
const orbitSpeed = (u: number) => 0.085 / (0.35 + u);
function toOrbit(fx: number, fy: number) {
  const ox = (fx - ORBIT.cx) / ORBIT.rx;
  const oy = (fy - ORBIT.cy) / ORBIT.ry;
  const u = Math.min(U_MAX, Math.max(U_MIN, Math.hypot(ox, oy)));
  return { u, th: Math.atan2(oy, ox) };
}

interface GoldStar {
  data: SkyStar;
  state: GoldState;
  t: number; // seconds in current state
  lx: number; // Lissajous params
  ly: number;
  la: number;
  lb: number;
  amp: number;
  u: number; // orbit radius, 0..1 of the screen-fitted ellipse
  th: number; // orbit angle (radians), grows clockwise like the galaxy
  du: number; // slow radial wander per second
  dth: number; // personal angular wander per second
  tw: number;
  tws: number;
  x: number; // last drawn position (CSS px)
  y: number;
  fx: number; // fall position / velocity
  fy: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  ring: number; // 0..1, fades the selection ring in and out
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export interface SkyOptions {
  onFallen?: (id: string) => void;
  reducedMotion?: boolean;
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const SQUASH = 0.68; // galaxy seen at an angle
const INCLINE = -0.42; // tilt of the galaxy across the screen (rad)
const PARALLAX = [5, 13, 26]; // px of shift per layer at full pointer offset
const DAY = 86_400_000;

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

export class SkyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: SkyOptions;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private cx = 0;
  private cy = 0;
  private raf = 0;
  private last = 0;
  private time = 0;

  private bg: HTMLCanvasElement | null = null;
  private galaxy: HTMLCanvasElement | null = null;
  private galaxyR = 0;
  private vignette: HTMLCanvasElement | null = null;
  private grain: HTMLCanvasElement[] = [];
  private halo: HTMLCanvasElement | null = null;
  private goldCore: HTMLCanvasElement | null = null;
  private emberDot: HTMLCanvasElement | null = null;
  private whiteDot: HTMLCanvasElement | null = null;
  private sprites: HTMLCanvasElement[][] = [];

  private dust: DustStar[] = [];
  private gold = new Map<string, GoldStar>();
  private shooters: Shooter[] = [];
  private nextShooter = 4;

  // pointer / tilt, -0.5..0.5, smoothed
  private px = 0;
  private py = 0;
  private tx = 0;
  private ty = 0;

  // scene controls
  private veil = 0;
  private veilTarget = 0;
  private dim = 0;
  private dimTarget = 0;
  private selected: string | null = null;
  private filterTonight = false;
  private highlightMine = false;
  private expectMine = false;
  private flareT = -1; // seconds since birth flare started, -1 = none
  private lowPower = false;
  private slowFrames = 0;

  constructor(canvas: HTMLCanvasElement, opts: SkyOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.opts = opts;
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  /* ---------------- public controls ---------------- */

  resize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const mobile = Math.min(W, H) < 600;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    const sizeChanged = W !== this.W || H !== this.H || dpr !== this.dpr;
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.cx = W * 0.5;
    this.cy = H * 0.44;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    if (sizeChanged || !this.bg) {
      this.buildSprites();
      this.buildBackground();
      this.buildGalaxy();
      this.buildVignette();
      this.buildDust();
    }
  }

  setPointer(nx: number, ny: number) {
    this.tx = Math.max(-0.5, Math.min(0.5, nx - 0.5));
    this.ty = Math.max(-0.5, Math.min(0.5, ny - 0.5));
  }

  setVeil(v: number) {
    this.veilTarget = v;
  }
  setDim(v: number) {
    this.dimTarget = v;
  }
  setFilterTonight(on: boolean) {
    this.filterTonight = on;
  }
  setHighlightMine(on: boolean) {
    this.highlightMine = on;
  }

  /** The next star of yours that arrives stays hidden until rise() is called. */
  expectRise() {
    this.expectMine = true;
  }

  setStars(stars: SkyStar[]) {
    const keep = new Set(stars.map((s) => s.id));
    for (const [id, g] of this.gold) {
      if (!keep.has(id) && g.state !== 'falling') this.gold.delete(id);
    }
    for (const s of stars) {
      const g = this.gold.get(s.id);
      if (g) g.data = s;
      else this.gold.set(s.id, this.makeGold(s, 'live'));
    }
  }

  addStar(s: SkyStar) {
    if (this.gold.has(s.id)) return;
    let state: GoldState = 'born';
    if (s.mine && this.expectMine) {
      state = 'held';
      this.expectMine = false;
    }
    this.gold.set(s.id, this.makeGold(s, state));
  }

  removeStar(id: string) {
    const g = this.gold.get(id);
    if (g && g.state !== 'falling') this.gold.delete(id);
  }

  /** Stage 4: gold ripple rings and a bright flare at the centre. */
  birth() {
    this.flareT = 0;
  }

  /** Stage 5: the held star rises from the flare to its place in the sky. */
  rise(id: string) {
    const g = this.gold.get(id);
    if (!g) return;
    g.state = 'rising';
    g.t = 0;
    g.trail = [];
  }

  /** The id of the golden star under a screen point, if any. */
  hitTest(clientX: number, clientY: number): string | null {
    let best: string | null = null;
    let bestD = 28 * 28;
    for (const [id, g] of this.gold) {
      if (g.state !== 'live' && g.state !== 'born') continue;
      if (this.isFaded(g)) continue;
      const dx = g.x - clientX;
      const dy = g.y - clientY;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  /** Mark the star whose card is open: it keeps moving and gets a soft gold ring. */
  select(id: string | null) {
    this.selected = id;
  }

  /** Screen position of a star (for placing UI next to it). */
  positionOf(id: string): { x: number; y: number } | null {
    const g = this.gold.get(id);
    if (!g || g.state === 'falling' || g.state === 'gone' || g.state === 'held') return null;
    return { x: g.x, y: g.y };
  }

  /* ---------------- builders ---------------- */

  /** Soft layers are rendered at a reduced scale: they are all gradients, so no detail is lost. */
  private offscreen(w: number, h: number, scale = 1): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    const g = c.getContext('2d')!;
    g.scale(scale, scale);
    return [c, g];
  }

  private buildSprites() {
    const d = this.dpr;
    this.sprites = STAR_SIZES.map((r) => STAR_COLORS.map((rgb) => starSprite(r, rgb, d)));
    this.halo = goldHalo(d);
    this.goldCore = starSprite(1.6, [255, 236, 196], d);
    this.emberDot = softDot([255, 196, 96], d, 24);
    this.whiteDot = softDot([255, 255, 255], d, 16);
    if (this.grain.length === 0) this.grain = grainTiles();
  }

  /** Static deep-space background with the warm horizon. */
  private buildBackground() {
    const { W, H } = this;
    const [c, g] = this.offscreen(W, H);
    g.fillStyle = '#010208';
    g.fillRect(0, 0, W, H);
    const D = Math.hypot(W, H);
    const blob = (x: number, y: number, r: number, stops: [number, string][], sy = 1) => {
      g.save();
      g.translate(x, y);
      g.scale(1, sy);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      stops.forEach(([t, col]) => gr.addColorStop(t, col));
      g.fillStyle = gr;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    };
    // cool outer wisps
    blob(W * 0.92, H * 0.06, D * 0.42, [[0, 'rgba(34,64,200,0.16)'], [0.5, 'rgba(14,30,110,0.06)'], [1, 'rgba(0,0,0,0)']]);
    blob(W * 0.04, H * 0.14, D * 0.4, [[0, 'rgba(100,22,160,0.15)'], [0.5, 'rgba(46,10,80,0.05)'], [1, 'rgba(0,0,0,0)']]);
    blob(W * 1.02, H * 0.6, D * 0.28, [[0, 'rgba(10,120,105,0.07)'], [1, 'rgba(0,0,0,0)']]);
    blob(W * -0.02, H * 0.72, D * 0.26, [[0, 'rgba(150,14,90,0.07)'], [1, 'rgba(0,0,0,0)']]);
    // reddish-orange horizon glow
    blob(W * 0.5, H * 1.04, W * 0.95, [[0, 'rgba(240,96,32,0.42)'], [0.25, 'rgba(196,58,16,0.24)'], [0.55, 'rgba(110,26,8,0.09)'], [1, 'rgba(0,0,0,0)']], 0.42 * (H / W) + 0.18);
    blob(W * 0.18, H * 1.0, W * 0.55, [[0, 'rgba(200,86,14,0.22)'], [0.6, 'rgba(80,24,4,0.06)'], [1, 'rgba(0,0,0,0)']], 0.6);
    blob(W * 0.86, H * 1.02, W * 0.6, [[0, 'rgba(214,62,20,0.22)'], [0.6, 'rgba(90,20,6,0.06)'], [1, 'rgba(0,0,0,0)']], 0.6);
    this.bg = c;
  }

  /** Galaxy core, spiral dust arms and haze, drawn once and rotated. */
  private buildGalaxy() {
    const R = Math.hypot(this.W, this.H) * 0.62;
    this.galaxyR = R;
    const [c, g] = this.offscreen(R * 2, R * 2, Math.min(1, 1400 / (R * 2)));
    g.translate(R, R);
    g.globalCompositeOperation = 'lighter';

    const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
    core.addColorStop(0, 'rgba(255,246,222,0.55)');
    core.addColorStop(0.08, 'rgba(250,220,170,0.30)');
    core.addColorStop(0.25, 'rgba(190,150,100,0.10)');
    core.addColorStop(0.6, 'rgba(70,60,90,0.04)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = core;
    g.beginPath();
    g.arc(0, 0, R * 0.42, 0, TAU);
    g.fill();

    // spiral arms: soft dust blobs along two logarithmic spirals
    const dot = softDot([200, 212, 255], 1, 64);
    const warm = softDot([255, 200, 160], 1, 64);
    const pink = softDot([255, 120, 150], 1, 32);
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 420; i++) {
        const t = Math.random();
        const r = 30 + t * R * 0.95;
        const th = arm * Math.PI + Math.log(r / 30 + 1) * 2.25 + gauss() * 0.22;
        const x = Math.cos(th) * r + gauss() * r * 0.05;
        const y = Math.sin(th) * r + gauss() * r * 0.05;
        const s = 26 + Math.random() * 70 * (1 - t * 0.5);
        g.globalAlpha = (0.05 + Math.random() * 0.06) * (1 - t * 0.7);
        g.drawImage(t < 0.25 && Math.random() < 0.5 ? warm : dot, x - s / 2, y - s / 2, s, s);
        if (Math.random() < 0.05) {
          const p = 6 + Math.random() * 12;
          g.globalAlpha = 0.25;
          g.drawImage(pink, x - p / 2, y - p / 2, p, p);
        }
      }
    }
    // dark dust lanes just inside the arms
    g.globalCompositeOperation = 'source-over';
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 160; i++) {
        const r = 40 + Math.random() * R * 0.7;
        const th = arm * Math.PI + Math.log(r / 30 + 1) * 2.25 - 0.28 + gauss() * 0.06;
        const s = 10 + Math.random() * 26;
        g.globalAlpha = 0.07;
        g.fillStyle = '#000';
        g.beginPath();
        g.arc(Math.cos(th) * r, Math.sin(th) * r, s / 2, 0, TAU);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    this.galaxy = c;
  }

  private buildVignette() {
    const { W, H } = this;
    const [c, g] = this.offscreen(W, H);
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.12)');
    gr.addColorStop(1, 'rgba(0,0,0,0.78)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    this.vignette = c;
  }

  /** Field stars fill the whole sky; arm and core stars make the spiral. */
  private buildDust() {
    const { W, H } = this;
    const corners = [
      [0, 0],
      [W, 0],
      [0, H],
      [W, H],
    ].map(([x, y]) => Math.hypot(x - this.cx, y - this.cy));
    const Rmax = (Math.max(...corners) / SQUASH) * 1.04;
    const screenArea = W * H;
    const ellipseArea = Math.PI * Rmax * Rmax * SQUASH;
    const targetVisible = Math.max(1400, Math.min(3400, screenArea / 115));
    const fieldTotal = Math.round(targetVisible * 0.7 * (ellipseArea / screenArea));
    const v0 = this.opts.reducedMotion ? 0.8 : 17; // px/s linear speed (visible, calm drift)

    const pickSprite = (big: boolean, palette: number[]) => {
      const sizeIdx = big
        ? 2 + Math.floor(Math.random() * 4)
        : Math.random() < 0.55
          ? 0
          : Math.random() < 0.7
            ? 1
            : 2;
      const colIdx = palette[Math.floor(Math.random() * palette.length)];
      return { sprite: this.sprites[sizeIdx][colIdx], r: STAR_SIZES[sizeIdx] };
    };

    const dust: DustStar[] = [];
    const add = (r: number, th: number, layer: 0 | 1 | 2, palette: number[], alphaBoost = 0) => {
      const big = layer === 2 && Math.random() < 0.35;
      const { sprite, r: sr } = pickSprite(big, palette);
      const glowR = sr * (sr > 1.2 ? 5 : 3.2);
      dust.push({
        r,
        th,
        w: (v0 * (0.75 + layer * 0.25)) / (r + 90),
        layer,
        sprite,
        size: glowR * 2,
        alpha: Math.min(1, 0.45 + Math.random() * 0.5 + alphaBoost),
        tw: Math.random() * TAU,
        tws: 0.4 + Math.random() * 2.4,
      });
    };

    const whites = [0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 5];
    for (let i = 0; i < fieldTotal; i++) {
      const r = Rmax * Math.sqrt(Math.random());
      const layer: 0 | 1 | 2 = Math.random() < 0.55 ? 0 : Math.random() < 0.62 ? 1 : 2;
      add(r, Math.random() * TAU, layer, whites);
    }
    // spiral arm stars
    const armTotal = Math.round(targetVisible * 0.45);
    for (let i = 0; i < armTotal; i++) {
      const arm = i % 2;
      const r = 40 + Math.pow(Math.random(), 0.85) * Rmax * 0.62;
      const th = arm * Math.PI + Math.log(r / 30 + 1) * 2.25 + gauss() * 0.2;
      const layer: 0 | 1 | 2 = Math.random() < 0.5 ? 0 : Math.random() < 0.6 ? 1 : 2;
      add(r, th, layer, [0, 0, 2, 2, 3, 3, 1], 0.1);
    }
    // dense warm core
    const coreTotal = Math.round(targetVisible * 0.18);
    for (let i = 0; i < coreTotal; i++) {
      const r = Math.abs(gauss()) * 70 + Math.random() * 30;
      add(r, Math.random() * TAU, Math.random() < 0.7 ? 0 : 1, [1, 1, 4, 0], 0.1);
    }
    this.dust = dust;
  }

  private makeGold(s: SkyStar, state: GoldState): GoldStar {
    return {
      data: s,
      state,
      t: 0,
      lx: Math.random() * TAU,
      ly: Math.random() * TAU,
      la: TAU / (26 + Math.random() * 22),
      lb: TAU / (32 + Math.random() * 26),
      amp: this.opts.reducedMotion ? 2 : 26 + Math.random() * 34,
      ...toOrbit(s.x, s.y),
      du: this.opts.reducedMotion ? 0 : (Math.random() - 0.5) * 0.012,
      dth: this.opts.reducedMotion ? 0 : (Math.random() - 0.5) * 0.012,
      tw: Math.random() * TAU,
      tws: 0.6 + Math.random() * 1.2,
      x: s.x * this.W,
      y: s.y * this.H,
      fx: 0,
      fy: 0,
      vx: 0,
      vy: 0,
      trail: [],
      ring: 0,
    };
  }

  private isFaded(g: GoldStar) {
    return this.filterTonight && Date.now() - g.data.releasedAt > DAY;
  }

  /* ---------------- frame ---------------- */

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    this.time += dt;

    // adapt quality on slow devices
    if (dt > 0.03) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90 && !this.lowPower) this.lowPower = true;

    const k = 1 - Math.pow(0.001, dt); // smoothing
    this.px += (this.tx - this.px) * k * 0.5;
    this.py += (this.ty - this.py) * k * 0.5;
    this.veil += (this.veilTarget - this.veil) * Math.min(1, dt * 5);
    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 5);

    const { ctx, W, H, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (this.bg) ctx.drawImage(this.bg, 0, 0, W, H);
    this.drawGalaxy();
    this.drawDust(dt);
    this.drawShooters(dt);
    this.drawGold(dt);
    this.drawFlare(dt);

    // veil (ritual) and dim (sheets)
    const cover = Math.max(this.veil * 0.66, this.dim * 0.4);
    if (cover > 0.002) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(0,0,6,${cover})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (this.vignette) ctx.drawImage(this.vignette, 0, 0, W, H);
    if (!this.lowPower) this.drawGrain();
  };

  private drawGalaxy() {
    if (!this.galaxy) return;
    const { ctx } = this;
    const R = this.galaxyR;
    const rot = this.time * (this.opts.reducedMotion ? 0.0012 : 0.024);
    ctx.save();
    ctx.translate(this.cx + this.px * PARALLAX[0], this.cy + this.py * PARALLAX[0]);
    ctx.rotate(INCLINE);
    ctx.scale(1, SQUASH);
    ctx.rotate(rot);
    ctx.globalAlpha = 1;
    ctx.drawImage(this.galaxy, -R, -R, R * 2, R * 2);
    ctx.restore();
  }

  private drawDust(dt: number) {
    const { ctx, W, H } = this;
    const ci = Math.cos(INCLINE);
    const si = Math.sin(INCLINE);
    const stride = this.lowPower ? 2 : 1;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.dust.length; i += stride) {
      const s = this.dust[i];
      s.th += s.w * dt;
      const gx = Math.cos(s.th) * s.r;
      const gy = Math.sin(s.th) * s.r * SQUASH;
      const x = this.cx + gx * ci - gy * si + this.px * PARALLAX[s.layer];
      const y = this.cy + gx * si + gy * ci + this.py * PARALLAX[s.layer];
      const half = s.size / 2;
      if (x < -half || x > W + half || y < -half || y > H + half) continue;
      s.tw += s.tws * dt;
      ctx.globalAlpha = s.alpha * (0.62 + 0.38 * Math.sin(s.tw));
      ctx.drawImage(s.sprite, x - half, y - half, s.size, s.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawShooters(dt: number) {
    const { ctx, W, H } = this;
    if (!this.opts.reducedMotion) {
      this.nextShooter -= dt;
      if (this.nextShooter <= 0) {
        this.nextShooter = 6 + Math.random() * 9;
        const fromLeft = Math.random() < 0.5;
        const ang = fromLeft ? 0.35 + Math.random() * 0.5 : Math.PI - 0.35 - Math.random() * 0.5;
        const sp = 520 + Math.random() * 420;
        this.shooters.push({
          x: fromLeft ? Math.random() * W * 0.6 : W * 0.4 + Math.random() * W * 0.6,
          y: Math.random() * H * 0.45,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0,
          max: 0.55 + Math.random() * 0.5,
        });
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    this.shooters = this.shooters.filter((s) => {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const p = s.life / s.max;
      const a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      const tail = 0.16;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tail, s.y - s.vy * tail);
      grad.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
      ctx.stroke();
      if (this.whiteDot) {
        ctx.globalAlpha = a;
        ctx.drawImage(this.whiteDot, s.x - 4, s.y - 4, 8, 8);
        ctx.globalAlpha = 1;
      }
      return s.life < s.max;
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawGold(dt: number) {
    const { ctx, W, H } = this;
    const halo = this.halo;
    const core = this.goldCore;
    const ember = this.emberDot;
    if (!halo || !core || !ember) return;
    const now = Date.now();
    const fcx = W * 0.5;
    const fcy = H * 0.46;
    ctx.globalCompositeOperation = 'lighter';

    for (const [id, g] of this.gold) {
      g.t += dt;
      g.ring += ((id === this.selected ? 1 : 0) - g.ring) * Math.min(1, dt * 4);
      g.lx += g.la * dt;
      g.ly += g.lb * dt;
      // Golden stars turn with the galaxy (inner ones faster, like the dust),
      // wander a little in and out, and sway gently on top.
      g.th += (orbitSpeed(g.u) * (this.opts.reducedMotion ? 0.05 : 1) + g.dth) * dt;
      g.u += g.du * dt;
      if (g.u < U_MIN || g.u > U_MAX) g.du = Math.abs(g.du) * (g.u < U_MIN ? 1 : -1);
      const homeX = (ORBIT.cx + Math.cos(g.th) * g.u * ORBIT.rx) * W + Math.sin(g.lx) * g.amp + this.px * PARALLAX[1];
      const homeY = (ORBIT.cy + Math.sin(g.th) * g.u * ORBIT.ry) * H + Math.sin(g.ly + 0.8) * g.amp * 0.6 + this.py * PARALLAX[1];

      if (g.state === 'held' || g.state === 'gone') continue;

      if (g.state === 'live' && now > g.data.expiresAt) {
        g.state = 'falling';
        g.t = 0;
        g.fx = g.x;
        g.fy = g.y;
        const dir = Math.random() < 0.5 ? -1 : 1;
        g.vx = dir * (60 + Math.random() * 80);
        g.vy = 40;
        g.trail = [];
      }

      if (g.state === 'falling') {
        g.vy += 260 * dt;
        g.fx += g.vx * dt;
        g.fy += g.vy * dt;
        g.trail.push({ x: g.fx, y: g.fy });
        if (g.trail.length > 46) g.trail.shift();
        const fade = Math.max(0, 1 - g.t / 2.6);
        this.drawTrail(g.trail, fade, 1.1);
        ctx.globalAlpha = fade;
        ctx.drawImage(halo, g.fx - 22, g.fy - 22, 44, 44);
        if (g.t > 2.6 || g.fy > H + 60) {
          g.state = 'gone';
          this.gold.delete(id);
          this.opts.onFallen?.(id);
        }
        continue;
      }

      let x = homeX;
      let y = homeY;
      let alpha = 1;
      let scale = 1;

      if (g.state === 'born') {
        const p = Math.min(1, g.t / 1.6);
        alpha = p;
        scale = 1 + (1 - p) * 1.8;
        if (p >= 1) g.state = 'live';
      } else if (g.state === 'rising') {
        const p = Math.min(1, g.t / 0.75);
        const e = 1 - Math.pow(1 - p, 3);
        x = fcx + (homeX - fcx) * e;
        y = fcy + (homeY - fcy) * e - Math.sin(p * Math.PI) * 40;
        scale = 1.9 - e * 0.9;
        g.trail.push({ x, y });
        if (g.trail.length > 30) g.trail.shift();
        this.drawTrail(g.trail, 1 - p * 0.6, 0.9);
        if (p >= 1) {
          g.state = 'live';
          g.trail = [];
        }
      }

      g.x = x;
      g.y = y;
      if (this.isFaded(g)) alpha *= 0.16;
      g.tw += g.tws * dt;
      const tw = 0.72 + 0.28 * Math.sin(g.tw);
      const hs = 46 * scale * (0.85 + tw * 0.2);
      ctx.globalAlpha = alpha * tw * 0.9;
      ctx.drawImage(halo, x - hs / 2, y - hs / 2, hs, hs);
      const cs = 16 * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(core, x - cs / 2, y - cs / 2, cs, cs);

      if (g.ring > 0.02 && g.state === 'live') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.9 * g.ring;
        ctx.strokeStyle = 'rgba(243,201,120,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 14 + Math.sin(this.time * 2.4) * 1.5, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.35 * g.ring;
        ctx.beginPath();
        ctx.arc(x, y, 22 + Math.sin(this.time * 2.4 + 1) * 2, 0, TAU);
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
      } else if (this.highlightMine && g.data.mine && g.state === 'live') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = 'rgba(243,201,120,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 17 + Math.sin(this.time * 2) * 1.5, 0, TAU);
        ctx.stroke();
        ctx.font = "9px 'Space Mono', monospace";
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F3C978';
        ctx.fillText('Y O U R S', x, y + 32);
        ctx.globalCompositeOperation = 'lighter';
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawTrail(trail: { x: number; y: number }[], fade: number, width: number) {
    const { ctx } = this;
    const ember = this.emberDot!;
    for (let i = 0; i < trail.length; i++) {
      const p = i / trail.length;
      const s = (3 + p * 12) * width;
      ctx.globalAlpha = p * p * fade * 0.85;
      ctx.drawImage(ember, trail[i].x - s / 2, trail[i].y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  private drawFlare(dt: number) {
    if (this.flareT < 0) return;
    this.flareT += dt;
    const t = this.flareT;
    if (t > 2.2) {
      this.flareT = -1;
      return;
    }
    const { ctx, W, H } = this;
    const x = W * 0.5;
    const y = H * 0.46;
    ctx.globalCompositeOperation = 'lighter';
    // ripple rings, staggered
    for (let i = 0; i < 5; i++) {
      const rt = t - i * 0.14;
      if (rt <= 0 || rt > 1.3) continue;
      const p = rt / 1.3;
      const r = 20 + p * (110 + i * 55);
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.strokeStyle = 'rgba(225,190,120,1)';
      ctx.lineWidth = 1.6 * (1 - p) + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
    }
    // flare and rays
    const a = t < 0.25 ? t / 0.25 : Math.max(0, 1 - (t - 0.25) / 1.4);
    if (a > 0 && this.halo) {
      const s = 260 * (0.6 + a * 0.4);
      ctx.globalAlpha = a;
      ctx.drawImage(this.halo, x - s / 2, y - s / 2, s, s);
      ctx.strokeStyle = 'rgba(255,248,220,1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI;
        const len = (i % 2 === 0 ? 130 : 105) * a;
        ctx.globalAlpha = a * 0.75;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawGrain() {
    if (this.grain.length === 0) return;
    const { ctx, W, H } = this;
    const tile = this.grain[(this.time * 24) % this.grain.length | 0];
    const pat = ctx.createPattern(tile, 'repeat');
    if (!pat) return;
    const ox = Math.random() * 160;
    const oy = Math.random() * 160;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.35;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W + 160, H + 160);
    ctx.restore();
  }
}
