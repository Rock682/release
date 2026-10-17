import { useEffect, useRef, useState } from 'react';
import { C, F } from '../theme';
import type { SkyStar } from '../data/store';
import type { SkyEngine } from '../sky/engine';
import { CANDLE_PRICE, PAYMENTS_LIVE } from '../lib/payments';
import { FlameIcon, Mono } from '../ui/kit';

interface Props {
  star: SkyStar;
  engine: SkyEngine | null;
  /** True once the card has been asked to go: it fades back into its star, then calls onGone. */
  closing: boolean;
  onClose: () => void;
  onGone: () => void;
  onCandle: () => Promise<void>;
  onReport: () => void;
}

const IDLE_MS = 15_000;
const FADE_MS = 750;
const GAP = 38; // distance between the star and the card edge
const EDGE = 12;

function ago(ms: number): string {
  const d = Date.now() - ms;
  const min = Math.round(d / 60_000);
  if (min < 2) return 'JUST NOW';
  if (min < 60) return `${min} MIN AGO`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? 'HOUR' : 'HOURS'} AGO`;
  const days = Math.round(h / 24);
  return `${days} ${days === 1 ? 'DAY' : 'DAYS'} AGO`;
}

/**
 * A small glowing card that floats beside a star and travels with it.
 * Nothing stops: the star keeps its course and the card rides along.
 */
export default function StarCard({ star, engine, closing, onClose, onGone, onCandle, onReport }: Props) {
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState(false);
  const [menu, setMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const closingAt = useRef(0);
  const idleRef = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;


  const fadeAndClose = () => closeRef.current();

  // Once asked to close: stop the idle clock, let the fade play, then leave.
  const goneRef = useRef(onGone);
  goneRef.current = onGone;
  useEffect(() => {
    if (!closing) return;
    clearTimeout(idleRef.current);
    closingAt.current = performance.now();
    setMenu(false);
    const t = window.setTimeout(() => goneRef.current(), FADE_MS + 50);
    return () => clearTimeout(t);
  }, [closing]);

  // Close by itself after a quiet while; any touch inside the card resets the clock.
  const poke = () => {
    clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(fadeAndClose, IDLE_MS);
  };
  useEffect(() => {
    poke();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fadeAndClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(idleRef.current);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the star every frame. Styles are written straight to the DOM so React doesn't re-render 60×/s.
  useEffect(() => {
    let raf = 0;
    let side: 1 | -1 = 1;
    let lost = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const card = cardRef.current;
      const p = engine?.positionOf(star.id);
      if (!card) return;
      if (!p) {
        // The star fell or was hidden: the card stays where it is and fades.
        if (++lost === 6) closeRef.current();
        return;
      }
      lost = 0;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      // Prefer the current side; flip only when the other side clearly has room (no jitter at the edge).
      const fitsRight = p.x + GAP + cw <= W - EDGE;
      const fitsLeft = p.x - GAP - cw >= EDGE;
      if (side === 1 && !fitsRight && fitsLeft) side = -1;
      else if (side === -1 && !fitsLeft && fitsRight) side = 1;
      let x = side === 1 ? p.x + GAP : p.x - GAP - cw;
      x = Math.min(Math.max(x, EDGE), W - cw - EDGE);
      let y = p.y - ch * 0.35;
      y = Math.min(Math.max(y, 64), H - ch - 18);
      card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // The closing fade shrinks the card toward its star, so aim it there.
      const box = boxRef.current;
      if (box) {
        const ox = Math.min(Math.max(p.x - x, 0), cw);
        const oy = Math.min(Math.max(p.y - y, 0), ch);
        box.style.transformOrigin = `${ox.toFixed(0)}px ${oy.toFixed(0)}px`;
        box.style.setProperty('--rl-tx', `${(-side * 16).toFixed(0)}px`);
      }
      // Line from the star to the nearest point on the card's edge.
      const ex = Math.min(Math.max(p.x, x), x + cw);
      const ey = Math.min(Math.max(p.y, y + 18), y + ch - 18);
      const line = lineRef.current;
      if (line) {
        const dx = ex - p.x;
        const dy = ey - p.y;
        const len = Math.hypot(dx, dy) || 1;
        // start just outside the star's ring
        const sx = p.x + (dx / len) * 16;
        const sy = p.y + (dy / len) * 16;
        // While closing, the line draws itself back into the star.
        const k = closingAt.current ? Math.min(1, (performance.now() - closingAt.current) / (FADE_MS * 0.8)) : 0;
        const e = k * k * (3 - 2 * k);
        const lx = ex + (sx - ex) * e;
        const ly = ey + (sy - ey) * e;
        line.setAttribute('x1', sx.toFixed(1));
        line.setAttribute('y1', sy.toFixed(1));
        line.setAttribute('x2', lx.toFixed(1));
        line.setAttribute('y2', ly.toFixed(1));
        line.style.opacity = len > 22 ? String(1 - e * 0.6) : '0';
        dotRef.current?.setAttribute('cx', lx.toFixed(1));
        dotRef.current?.setAttribute('cy', ly.toFixed(1));
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [engine, star.id]);

  return (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 29,
          animation: closing ? `rl-fade-out ${FADE_MS}ms ease forwards` : 'rl-fade-in .5s ease both',
        }}
      >
        <line ref={lineRef} stroke="rgba(243,201,120,.7)" strokeWidth={1} style={{ filter: 'drop-shadow(0 0 3px rgba(243,201,120,.8))' }} />
        <circle ref={dotRef} r={2} fill="#F3C978" />
      </svg>

      <div
        ref={cardRef}
        data-blocks-sky
        role="dialog"
        aria-label="A released mistake"
        aria-hidden={closing || undefined}
        onPointerDown={poke}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 30,
          width: 'min(272px, calc(100vw - 24px))',
          willChange: 'transform',
          transform: 'translate3d(-9999px, 0, 0)',
          // a fading card lets taps through to the sky
          pointerEvents: closing ? 'none' : 'auto',
        }}
      >
        <div
          ref={boxRef}
          style={{
            padding: '14px 16px 12px',
            borderRadius: 18,
            background: 'linear-gradient(160deg, rgba(20,16,12,.88), rgba(6,6,14,.9))',
            border: '1px solid rgba(200,169,110,.45)',
            boxShadow: '0 14px 40px rgba(0,0,0,.6), 0 0 28px rgba(200,169,110,.18), inset 0 0 18px rgba(200,169,110,.06)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            fontFamily: F.serif,
            color: C.text,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animation: closing
              ? `rl-card-out ${FADE_MS}ms cubic-bezier(.4,0,.2,1) forwards`
              : 'rl-card-in .55s cubic-bezier(.2,.8,.2,1) both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Mono style={{ fontSize: 9, color: C.gold, letterSpacing: '.18em' }}>
              {ago(star.releasedAt)}
            </Mono>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                  type="button"
                  aria-label="More"
                  aria-expanded={menu}
                  onClick={() => setMenu((m) => !m)}
                  style={iconBtn}
                >
                  ···
                </button>
              <button type="button" aria-label="Close" onClick={fadeAndClose} style={{ ...iconBtn, fontSize: 18 }}>
                ×
              </button>
              {menu && (
                <div
                  style={{
                    position: 'absolute',
                    top: 34,
                    right: 0,
                    padding: 4,
                    borderRadius: 12,
                    background: '#0b0b16',
                    border: '1px solid rgba(200,169,110,.3)',
                    boxShadow: '0 10px 30px rgba(0,0,0,.6)',
                    animation: 'rl-fade-in .2s ease both',
                    zIndex: 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={onReport}
                    style={{ minHeight: 36, padding: '0 14px', background: 'none', border: 'none', whiteSpace: 'nowrap', fontFamily: F.mono, fontSize: 10, letterSpacing: '.14em', color: C.textSoft, cursor: 'pointer' }}
                  >
                    REPORT THIS STAR
                  </button>
                </div>
              )}
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 19,
              lineHeight: 1.4,
              fontWeight: 400,
              fontStyle: 'italic',
              color: C.textBright,
              textShadow: '0 0 18px rgba(243,201,120,.18)',
              overflowWrap: 'anywhere',
              filter: closing ? 'blur(2.5px)' : 'none',
              opacity: closing ? 0 : 1,
              transition: `filter ${FADE_MS * 0.8}ms ease, opacity ${FADE_MS * 0.7}ms ease`,
            }}
          >
            “{star.text}”
          </p>

          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,169,110,.4), transparent)' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Mono style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '.1em', color: C.textSoft }}>
              <span style={{ color: C.goldBright, display: 'flex' }}>
                <FlameIcon size={12} />
              </span>
              {star.candles}
            </Mono>
            <button
                type="button"
                disabled={busy || lit}
                onClick={async () => {
                  setBusy(true);
                  await onCandle();
                  setBusy(false);
                  setLit(true);
                  poke();
                }}
                style={{
                  minHeight: 38,
                  padding: '0 14px',
                  borderRadius: 19,
                  border: `1px solid ${lit ? 'rgba(243,201,120,.7)' : 'rgba(200,169,110,.55)'}`,
                  background: lit ? 'rgba(243,201,120,.16)' : 'rgba(200,169,110,.08)',
                  color: lit ? C.goldPale : C.text,
                  fontFamily: F.serif,
                  fontSize: 15,
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: busy || lit ? 'default' : 'pointer',
                  boxShadow: lit ? '0 0 18px rgba(243,201,120,.35)' : 'none',
                  transition: 'all .3s ease',
                }}
              >
                <span style={{ display: 'flex', color: C.goldBright, animation: 'rl-flicker 1.4s ease-in-out infinite', transformOrigin: '50% 100%' }}>
                  <FlameIcon size={13} />
                </span>
                {lit ? 'Your candle is lit' : busy ? 'Lighting…' : `Send warmth · ${CANDLE_PRICE.label}`}
              </button>
          </div>
          {!PAYMENTS_LIVE && !lit && (
            <Mono as="p" style={{ margin: 0, textAlign: 'right', fontSize: 8, letterSpacing: '.12em' }}>
              TEST MODE · NO REAL PAYMENT
            </Mono>
          )}
        </div>
      </div>
    </>
  );
}

const iconBtn = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  color: C.textDim,
  fontFamily: F.mono,
  fontSize: 13,
  cursor: 'pointer',
  padding: 0,
} as const;
