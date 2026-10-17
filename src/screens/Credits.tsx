import { useState } from 'react';
import { C, T } from '../theme';
import { PAYMENTS_LIVE, RELEASE_PRICE, pay } from '../lib/payments';
import { GoldButton, Live, Mono, Rule, Scrim, Screen, TopBar } from '../ui/kit';

interface Props {
  /** The words waiting to be released, shown so the person knows what they're paying for. */
  text: string;
  onBack: () => void;
  onPaid: () => void | Promise<void>;
}

/** Every release after the first: one payment, then the ritual starts straight away. */
export default function Credits({ text, onBack, onPaid }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const r = await pay(RELEASE_PRICE.amount, RELEASE_PRICE.currency, 'release');
    if (r.ok) await onPaid();
    setBusy(false);
    if (r.ok) return;
    setError('The payment didn’t go through. Nothing was charged.');
  };

  return (
    <Screen label="Release again" scroll>
      <Scrim top="50%" height="64%" />
      <TopBar onBack={onBack} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 22 }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 500, textShadow: T.title, fontStyle: 'italic', color: C.goldPale, textAlign: 'center' }}>
          Release again
        </h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5, color: 'rgba(232,220,200,.82)', textAlign: 'center' }}>
          Your first release was a gift. Each one after keeps this sky open for everyone.
        </p>
        {text && (
          <>
            <Rule />
            <p style={{ margin: 0, fontSize: 22, lineHeight: 1.45, fontWeight: 300, fontStyle: 'italic', color: C.textBright, textAlign: 'center' }}>
              “{text}”
            </p>
            <Rule />
          </>
        )}
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: 44, fontWeight: 300, color: C.goldBright }}>{RELEASE_PRICE.label}</span>
          <Mono style={{ letterSpacing: '.16em' }}>FOR THIS RELEASE</Mono>
        </div>
      </div>

      <Live style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {error && <p style={{ margin: 0, color: '#E58C6E', fontStyle: 'italic', textAlign: 'center' }}>{error}</p>}
        <GoldButton onClick={buy} disabled={busy}>
          {busy ? 'OPENING PAYMENT…' : `PAY ${RELEASE_PRICE.label} AND RELEASE`}
        </GoldButton>
        <Mono style={{ letterSpacing: '.12em' }}>{PAYMENTS_LIVE ? 'UPI · CARDS · WALLETS' : 'TEST MODE · NO REAL PAYMENT'}</Mono>
        <span style={{ fontSize: 14, fontStyle: 'italic', color: C.textDim, textAlign: 'center' }}>
          One payment per release. No subscription.
        </span>
      </Live>
    </Screen>
  );
}
