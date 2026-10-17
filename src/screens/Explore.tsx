import { C, F, T } from '../theme';
import { BackIcon, GhostButton, IconButton, Live, Mono, Screen } from '../ui/kit';

interface Props {
  tonight: boolean;
  onToggle: (tonight: boolean) => void;
  tonightCount: number;
  totalCount: number;
  onBack: () => void;
  onRelease: () => void;
}

export default function Explore({ tonight, onToggle, tonightCount, totalCount, onBack, onRelease }: Props) {
  const seg = (on: boolean) => ({
    minHeight: 36,
    padding: '0 16px',
    borderRadius: 18,
    border: 'none',
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: '.16em',
    cursor: 'pointer',
    background: on ? C.gold : 'transparent',
    color: on ? C.ink : C.textSoft,
  });

  return (
    <Screen label="Explore the sky">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <IconButton label="Back" onClick={onBack}>
          <BackIcon />
        </IconButton>
        <Live>
          <div
            role="tablist"
            aria-label="Which stars"
            style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 22, background: 'rgba(10,10,20,.6)', border: '1px solid rgba(200,169,110,.2)' }}
          >
            <button role="tab" aria-selected={tonight} style={seg(tonight)} onClick={() => onToggle(true)}>
              TONIGHT
            </button>
            <button role="tab" aria-selected={!tonight} style={seg(!tonight)} onClick={() => onToggle(false)}>
              ALL TIME
            </button>
          </div>
        </Live>
        <span style={{ width: 44 }} />
      </div>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, textShadow: T.title, fontStyle: 'italic', color: C.goldPale }}>The sky</h1>
        <Mono as="p" style={{ marginTop: 4, letterSpacing: '.16em' }}>
          {tonight
            ? `${tonightCount.toLocaleString('en-IN')} ${tonightCount === 1 ? 'STAR' : 'STARS'} RELEASED IN THE LAST DAY`
            : `${totalCount.toLocaleString('en-IN')} STARS IN THE SKY`}
        </Mono>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 17, fontStyle: 'italic', color: C.textSoft, textAlign: 'center' }}>
          Tap a golden star to read what someone let go.
        </p>
        <GhostButton onClick={onRelease} style={{ letterSpacing: '.26em', background: 'rgba(2,3,10,.55)', borderColor: 'rgba(200,169,110,.5)', color: C.text }}>
          RELEASE YOURS
        </GhostButton>
      </div>
    </Screen>
  );
}
