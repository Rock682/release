import { useEffect, useRef, useState } from 'react';
import { C, F } from '../theme';

interface Props {
  onWrite: () => void;
}

const SHOW_MS = 4000;

/**
 * Nothing but the sky, and one small way back in at the bottom.
 * The button rests softly and brightens whenever the sky is touched.
 */
export default function PureSky({ onWrite }: Props) {
  const [awake, setAwake] = useState(true);
  const [hint, setHint] = useState(true);
  const timer = useRef(0);

  useEffect(() => {
    const wake = () => {
      setAwake(true);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAwake(false), SHOW_MS);
    };
    wake();
    const h = window.setTimeout(() => setHint(false), 4500);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(timer.current);
      clearTimeout(h);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  const bottom = 'max(26px, calc(env(safe-area-inset-bottom) + 14px))';

  return (
    <main aria-label="The sky" style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      {/* a one-time whisper above the button, then silence */}
      <p
        aria-live="polite"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: `calc(${bottom} + 62px)`,
          margin: 0,
          textAlign: 'center',
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 16,
          color: C.textSoft,
          textShadow: '0 1px 10px rgba(0,0,0,.9)',
          opacity: hint ? 1 : 0,
          transition: 'opacity 1.6s ease',
        }}
      >
        Tap a golden star to read it.
      </p>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center', animation: 'rl-fade-up 1s ease .3s both' }}>
        <button
          type="button"
          onClick={onWrite}
          style={{
            minHeight: 44,
            padding: '0 22px',
            borderRadius: 22,
            background: 'rgba(2,3,10,.45)',
            border: '1px solid rgba(200,169,110,.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            color: '#F2DDAE',
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 17,
            cursor: 'pointer',
            pointerEvents: 'auto',
            opacity: awake ? 1 : 0.5,
            boxShadow: awake ? '0 0 22px rgba(200,169,110,.28)' : 'none',
            transition: 'opacity 1.2s ease, box-shadow 1.2s ease',
          }}
        >
          What is your biggest mistake?
        </button>
      </div>
    </main>
  );
}
