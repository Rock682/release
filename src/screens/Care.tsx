import { C, F, T } from '../theme';
import { Live, Mono, PhoneIcon, Screen, TextButton, TopBar } from '../ui/kit';

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Shown instead of the ritual when the words suggest the person may be in danger.
 * Helpline details must be re-checked before launch.
 */
export default function Care({ onContinue, onBack }: Props) {
  return (
    <Screen label="A moment of care">
      <TopBar onBack={onBack} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <span
          aria-hidden="true"
          style={{
            alignSelf: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,225,170,.55), rgba(220,150,70,.18) 50%, transparent 72%)',
          }}
        />
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.2, fontWeight: 500, textShadow: T.title, fontStyle: 'italic', textAlign: 'center', color: C.goldPale }}>
          Before you let go,
          <br />
          stay a moment.
        </h1>
        <p style={{ margin: 0, fontSize: 19, lineHeight: 1.6, textAlign: 'center', color: 'rgba(232,220,200,.85)' }}>
          What you wrote sounds heavy. You don’t have to carry it alone tonight. A real person can listen right now, for free.
        </p>
        <Live
          style={{
            marginTop: 6,
            padding: 18,
            borderRadius: 18,
            border: '1px solid rgba(200,169,110,.3)',
            background: C.panel,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <Mono style={{ color: C.gold }}>INDIA · FREE · 24 HOURS</Mono>
          <span style={{ fontSize: 22, color: C.textBright }}>Tele-MANAS · 14416</span>
          <span style={{ fontSize: 15, fontStyle: 'italic', color: C.textSoft }}>
            Outside India:{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer" style={{ color: C.goldBright }}>
              findahelpline.com
            </a>
          </span>
        </Live>
      </div>
      <Live style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a
          href="tel:14416"
          style={{
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            borderRadius: 28,
            background: C.gold,
            color: C.ink,
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing: '.2em',
            textDecoration: 'none',
          }}
        >
          <PhoneIcon />
          TALK TO SOMEONE NOW
        </a>
        <TextButton onClick={onContinue}>Continue my release</TextButton>
      </Live>
    </Screen>
  );
}
