import { useState } from 'react';
import { C, T } from '../theme';
import { CloseIcon, IconButton, ShareIcon, GoldButton, Live, Mono, Rule, Scrim, Screen, TextButton, TopBar } from '../ui/kit';

/** The same message for everyone, by design. */
export const FORGIVENESS_MESSAGE =
  'You are not the worst thing you have done. The sky has held every regret ever carried, and it holds yours now. You can set it down.';

interface Props {
  onShare: () => void;
  onAnother: () => void;
  /** Close everything and leave only the sky. */
  onClose: () => void;
}

const FADE_MS = 1000;

export default function Forgiveness({ onShare, onAnother, onClose }: Props) {
  const [leaving, setLeaving] = useState(false);
  const close = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onClose, FADE_MS);
  };
  return (
    <Screen
      label="Forgiveness"
      style={{
        alignItems: 'stretch',
        ...(leaving ? { animation: `rl-fade-out ${FADE_MS}ms ease forwards`, pointerEvents: 'none' as const } : null),
      }}
    >
      <Scrim top="50%" height="52%" />
      <TopBar
        right={
          <span style={{ animation: 'rl-fade-in 1s ease 1.2s both' }}>
            <IconButton label="Close and see the sky" onClick={close} bordered>
              <CloseIcon />
            </IconButton>
          </span>
        }
      />
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, animation: 'rl-fade-up 1s ease both' }}>
        <span
          aria-hidden="true"
          style={{ width: 10, height: 10, borderRadius: '50%', background: '#fffaf0', animation: 'rl-orb 3s ease-in-out infinite' }}
        />
        <Mono style={{ color: C.gold, letterSpacing: '.2em' }}>YOUR STAR HAS JOINED THE SKY</Mono>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
          animation: 'rl-fade-up 1.4s ease .3s both',
        }}
      >
        <Rule />
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(23px, 6.8vw, 28px)',
            lineHeight: 1.55,
            fontWeight: 400,
            textShadow: T.title,
            fontStyle: 'italic',
            textAlign: 'center',
            color: C.textBright,
          }}
        >
          {FORGIVENESS_MESSAGE}
        </p>
        <Rule />
      </div>

      <Live style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'rl-fade-up 1s ease .9s both' }}>
        <GoldButton onClick={onShare}>
          <ShareIcon />
          SHARE MY STAR
        </GoldButton>
        <TextButton onClick={onAnother}>Release another</TextButton>
      </Live>
    </Screen>
  );
}
