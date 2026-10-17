import { useEffect, useRef } from 'react';
import { SkyEngine } from './engine';
import { store } from '../data/store';
import { prefersReducedMotion } from '../theme';

interface Props {
  onReady: (engine: SkyEngine) => void;
  onStarTap: (id: string) => void;
  /** A tap on the sky that didn't hit a star. */
  onEmptyTap?: () => void;
  /** Taps on stars are ignored while false (e.g. during the ritual). */
  interactive: boolean;
}

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** Full-screen canvas sky. All drawing lives in SkyEngine; this only wires events. */
export default function StarSky({ onReady, onStarTap, onEmptyTap, interactive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tapRef = useRef(onStarTap);
  const emptyRef = useRef(onEmptyTap);
  emptyRef.current = onEmptyTap;
  const interactiveRef = useRef(interactive);
  tapRef.current = onStarTap;
  interactiveRef.current = interactive;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new SkyEngine(canvas, {
      reducedMotion: prefersReducedMotion(),
      onFallen: (id) => store.markFallen(id),
    });
    engine.setStars(store.getStars());
    onReady(engine);

    const unsub = store.subscribe((e) => {
      if (e.type === 'added') engine.addStar(e.star);
      else if (e.type === 'removed') engine.removeStar(e.id);
      else engine.setStars(store.getStars());
    });

    const onResize = () => engine.resize();
    const onMove = (e: PointerEvent) => engine.setPointer(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      engine.setPointer(0.5 + e.gamma / 60, 0.5 + (e.beta - 45) / 90);
    };

    // iPhone asks for motion permission; it can only be requested from a tap.
    const Orientation = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    let asked = false;
    const askTilt = () => {
      if (asked) return;
      asked = true;
      Orientation?.requestPermission?.()
        .then((r) => {
          if (r === 'granted') window.addEventListener('deviceorientation', onTilt);
        })
        .catch(() => {});
    };
    if (Orientation && !Orientation.requestPermission) window.addEventListener('deviceorientation', onTilt);

    // Taps anywhere that isn't a control (or inside a sheet) can pick a star.
    const onClick = (e: MouseEvent) => {
      if (!interactiveRef.current) return;
      const t = e.target as Element | null;
      if (t?.closest('button, a, textarea, input, label, [data-blocks-sky]')) return;
      const id = engine.hitTest(e.clientX, e.clientY);
      if (id) tapRef.current(id);
      else emptyRef.current?.();
    };
    window.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', askTilt, { passive: true });
    return () => {
      unsub();
      engine.destroy();
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', askTilt);
      window.removeEventListener('deviceorientation', onTilt);
    };
    // onReady is stable for the app's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, display: 'block', touchAction: 'manipulation' }}
    />
  );
}
