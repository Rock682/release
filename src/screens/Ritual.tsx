import { Fragment, useEffect, useMemo, useState } from 'react';
import { C, F, T } from '../theme';
import { Brand, Screen, Mono, Scrim } from '../ui/kit';
import type { SkyEngine } from '../sky/engine';
import type { SkyStar } from '../data/store';

/** Stage start times in ms. The whole ritual lasts exactly 4.2 seconds. */
const STAGES = [
  { name: 'VEIL', at: 0 },
  { name: 'GLOW', at: 900 },
  { name: 'DISSOLVE', at: 1900 },
  { name: 'BIRTH', at: 2700 },
  { name: 'RISE', at: 3500 },
];
const TOTAL = 4200;

interface Props {
  text: string;
  engine: SkyEngine | null;
  release: (text: string) => Promise<SkyStar>;
  onDone: (star: SkyStar) => void;
  onError: (e?: unknown) => void;
}

export default function Ritual({ text, engine, release, onDone, onError }: Props) {
  const [stage, setStage] = useState(0); // 0..4 index into STAGES

  // A random drift for every character, fixed for this ritual.
  const words = useMemo(() => {
    let i = 0;
    const total = text.replace(/\s+/g, '').length || 1;
    return text.split(/\s+/).filter(Boolean).map((w) =>
      Array.from(w).map((ch) => {
        const k = i++;
        return {
          ch,
          dx: (Math.random() - 0.5) * 120,
          dy: -(80 + Math.random() * 180),
          rot: (Math.random() - 0.5) * 70,
          delay: (k / total) * 380 + Math.random() * 120,
        };
      }),
    );
  }, [text]);

  useEffect(() => {
    const timers: number[] = [];
    let star: SkyStar | null = null;
    let cancelled = false;
    let late = false;
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    engine?.setVeil(1);
    at(STAGES[1].at, () => setStage(1));
    at(STAGES[2].at, () => setStage(2));
    at(STAGES[3].at, () => {
      setStage(3);
      engine?.expectRise();
      release(text)
        .then((s) => {
          if (cancelled) return;
          star = s;
          engine?.birth();
          navigator.vibrate?.(30);
          // A slow server: finish the rise as soon as the star exists.
          if (late) {
            engine?.rise(s.id);
            at(800, () => onDone(s));
          }
        })
        .catch((e) => {
          if (!cancelled) onError(e);
        });
    });
    at(STAGES[4].at, () => {
      setStage(4);
      engine?.setVeil(0);
      if (star) engine?.rise(star.id);
    });
    at(TOTAL, () => {
      if (star) onDone(star);
      else late = true;
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      engine?.setVeil(0);
    };
    // the ritual runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowing = stage >= 1;
  const dissolving = stage >= 2;

  return (
    <Screen label="Releasing">
      {stage < 3 && <Scrim top="50%" height="40%" />}
      <div style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Brand dim>THE RELEASE</Brand>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        {stage < 3 ? (
          <>
            <p
              aria-live="polite"
              style={{
                margin: 0,
                textAlign: 'center',
                fontFamily: F.serif,
                fontSize: 'clamp(22px, 6.6vw, 28px)',
                lineHeight: 1.5,
                fontStyle: 'italic',
                fontWeight: 300,
                color: glowing ? '#F3C978' : '#F2E8D6',
                transition: 'color .7s ease',
                animation: glowing ? 'rl-glow-text 1s ease-in-out infinite' : 'none',
              }}
            >
              {words.map((w, wi) => (
                <Fragment key={wi}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {w.map((c, ci) => (
                    <span
                      key={ci}
                      style={{
                        display: 'inline-block',
                        transform: dissolving ? `translate(${c.dx}px, ${c.dy}px) rotate(${c.rot}deg) scale(1.15)` : 'none',
                        opacity: dissolving ? 0 : 1,
                        filter: dissolving ? 'blur(1.5px)' : 'none',
                        transition: dissolving
                          ? `transform .8s cubic-bezier(.2,.6,.3,1) ${c.delay}ms, opacity .7s ease ${c.delay + 120}ms, filter .7s ease ${c.delay}ms`
                          : 'none',
                      }}
                    >
                      {c.ch}
                    </span>
                  ))}
                </span>
                {wi < words.length - 1 ? ' ' : ''}
                </Fragment>
              ))}
            </p>
            <Mono
              style={{
                fontSize: 11,
                color: C.gold,
                textTransform: 'uppercase',
                textShadow: '0 0 18px rgba(200,169,110,.6)',
                animation: 'rl-breathe-text 1.3s ease-in-out infinite',
              }}
            >
              releasing to the universe
            </Mono>
          </>
        ) : (
          <div style={{ position: 'fixed', left: 0, right: 0, top: '62%', textAlign: 'center', animation: 'rl-fade-up .6s ease both' }}>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, textShadow: T.title, fontStyle: 'italic', color: C.goldPale }}>A new star.</h1>
            <p style={{ margin: '8px 0 0', fontSize: 18, color: C.textSoft }}>
              {stage === 4 ? 'It rises now to join the others.' : 'Born from what you let go.'}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div role="progressbar" aria-label="Release ritual" aria-valuemin={1} aria-valuemax={5} aria-valuenow={stage + 1} style={{ display: 'flex', gap: 10 }}>
          {STAGES.map((s, i) => (
            <span
              key={s.name}
              style={{
                width: i === stage ? 40 : 22,
                height: 2,
                borderRadius: 1,
                background: i < stage ? C.gold : i === stage ? C.goldBright : 'rgba(200,169,110,.25)',
                boxShadow: i === stage ? `0 0 8px ${C.goldBright}` : 'none',
                transition: 'width .4s ease, background .4s ease',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {STAGES.map((s, i) => (
            <Mono key={s.name} style={{ fontSize: 9, letterSpacing: '.12em', color: i === stage ? C.goldBright : C.textDim }}>
              {s.name}
            </Mono>
          ))}
        </div>
      </div>
    </Screen>
  );
}
