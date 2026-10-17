import { useId } from 'react';
import { C, F, T } from '../theme';
import { MAX_CHARS } from '../lib/safety';
import { Brand, GhostButton, IconButton, Live, Mono, Scrim, Screen, StarIcon } from '../ui/kit';

interface Props {
  text: string;
  onText: (t: string) => void;
  onRelease: () => void;
  onExplore: () => void;
  count: number;
  allowance: { free: boolean; credits: number; allFree: boolean };
}

export default function Begin({ text, onText, onRelease, onExplore, count, allowance }: Props) {
  const id = useId();
  const n = text.length;
  const ready = text.trim().length > 0;
  const barColor = n > MAX_CHARS * 0.9 ? '#E58C6E' : C.gold;

  let note = allowance.allFree ? 'EVERY RELEASE IS FREE THIS WEEK' : 'YOUR FIRST RELEASE IS FREE';
  if (!allowance.free && !allowance.allFree) {
    note = allowance.credits > 0 ? 'YOUR PAID RELEASE IS READY' : '';
  }

  return (
    <Screen label="Write your mistake">
      <Scrim top="50%" height="62%" />
      <Scrim top="40%" height="30%" strength={0.7} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <span style={{ width: 44 }} />
        <Brand>THE RELEASE</Brand>
        <IconButton label="Explore the sky" onClick={onExplore} bordered>
          <StarIcon />
        </IconButton>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 34 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(38px, 11vw, 52px)',
            lineHeight: 1.1,
            fontWeight: 500,
            fontStyle: 'italic',
            color: '#F7E3B5',
            textAlign: 'center',
            textShadow: T.title,
          }}
        >
          What is your
          <br />
          biggest mistake?
        </h1>

        <Live style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* label kept for screen readers only */}
          <label htmlFor={id} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>
            Your biggest mistake
          </label>
          <textarea
            id={id}
            rows={3}
            maxLength={MAX_CHARS}
            value={text}
            onChange={(e) => onText(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready) onRelease();
            }}
            placeholder="Write it here, into the dark…"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 0 10px',
              resize: 'none',
              fontFamily: F.serif,
              fontSize: 23,
              lineHeight: 1.4,
              fontStyle: 'italic',
              fontWeight: 300,
              color: '#F2E8D6',
              caretColor: C.gold,
            }}
          />
          <div style={{ position: 'relative', height: 1, background: 'rgba(200,169,110,.35)' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: -1,
                height: 3,
                borderRadius: 2,
                width: `${(n / MAX_CHARS) * 100}%`,
                background: barColor,
                boxShadow: `0 0 10px ${barColor}, 0 0 22px rgba(200,169,110,.55)`,
                transition: 'width .15s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Mono style={{ letterSpacing: '.04em', color: n > 0 ? C.gold : C.textDim }}>
              {n} / {MAX_CHARS}
            </Mono>
          </div>
        </Live>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <GhostButton onClick={onRelease} disabled={!ready} glowing>
          RELEASE
        </GhostButton>
        {note && <Mono style={{ color: C.gold, letterSpacing: '.14em' }}>{note}</Mono>}
        <span style={{ fontSize: 15, fontStyle: 'italic', color: C.textDim }}>
          {count.toLocaleString('en-IN')} releases held by the sky
        </span>
      </div>
    </Screen>
  );
}
