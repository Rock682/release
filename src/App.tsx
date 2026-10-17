import { useCallback, useEffect, useRef, useState } from 'react';
import StarSky from './sky/StarSky';
import type { SkyEngine } from './sky/engine';
import { store, type Allowance, type SkyStar } from './data/store';
import { needsCare, scrub } from './lib/safety';
import { CANDLE_PRICE, pay } from './lib/payments';
import Begin from './screens/Begin';
import Ritual from './screens/Ritual';
import Forgiveness from './screens/Forgiveness';
import Care from './screens/Care';
import Explore from './screens/Explore';
import StarCard from './screens/StarCard';
import Credits from './screens/Credits';
import Share from './screens/Share';
import PureSky from './screens/PureSky';
import { C, F } from './theme';

type ScreenName = 'begin' | 'care' | 'ritual' | 'forgiveness' | 'sky' | 'credits' | 'share' | 'pure';

// Screens worth a "back" step; the others replace the current history entry.
const STACKED: ScreenName[] = ['sky', 'credits', 'share', 'care', 'pure'];
const DAY = 86_400_000;

const DEFAULT_ALLOWANCE: Allowance = { free: true, credits: 0, allFree: false, testMode: true };

/** Plain words for what went wrong with a release. */
function releaseProblem(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  if (m.includes('slow_down')) return 'You’ve released a lot in a short time. Rest a while, then come back.';
  if (m.includes('empty')) return 'There was nothing left to release. Try writing it a little differently.';
  return 'The sky couldn’t be reached just now. Nothing was spent, please try again.';
}

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('begin');
  const [text, setText] = useState('');
  const [ritualText, setRitualText] = useState('');
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [tonight, setTonight] = useState(false);
  const [allow, setAllow] = useState<Allowance>(DEFAULT_ALLOWANCE);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState('');
  const [lastStar, setLastStar] = useState<{ id: string; releasedAt: number } | null>(null);
  const [, setVersion] = useState(0);
  const [engine, setEngine] = useState<SkyEngine | null>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  // Cards that are fading back into their stars (kept with their text so they can finish smoothly).
  const [fading, setFading] = useState<SkyStar[]>([]);
  const sheetRef = useRef(sheetId);
  sheetRef.current = sheetId;
  const openStarRef = useRef<SkyStar | null>(null);

  /** Send the open card (if any) into its fade. */
  const retire = useCallback(() => {
    const cur = sheetRef.current;
    const s = openStarRef.current;
    if (cur && s && s.id === cur) setFading((f) => [...f.filter((x) => x.id !== cur), s]);
  }, []);
  const closeCard = useCallback(() => {
    retire();
    sheetRef.current = null;
    setSheetId(null);
  }, [retire]);
  const openCard = useCallback(
    (id: string) => {
      if (id === sheetRef.current) return;
      retire();
      setFading((f) => f.filter((x) => x.id !== id));
      sheetRef.current = id;
      setSheetId(id);
    },
    [retire],
  );

  // Re-render counts and the open sheet when the sky changes.
  useEffect(() => store.subscribe(() => setVersion((v) => v + 1)), []);

  // What this visitor may do comes from the server.
  const refreshAllowance = useCallback(() => {
    store.getAllowance().then(setAllow).catch(() => {});
  }, []);
  useEffect(refreshAllowance, [refreshAllowance]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const go = useCallback((s: ScreenName) => {
    if (s === screenRef.current) return;
    if (STACKED.includes(s)) history.pushState({ s }, '');
    else history.replaceState({ s }, '');
    closeCard();
    setScreen(s);
  }, [closeCard]);

  // Phone back button: step back through screens, close sheets, never interrupt the ritual.
  useEffect(() => {
    history.replaceState({ s: 'begin' }, '');
    const onPop = (e: PopStateEvent) => {
      const cur = screenRef.current;
      if (cur === 'ritual') {
        history.pushState({ s: 'ritual' }, '');
        return;
      }
      closeCard();
      const target = (e.state?.s as ScreenName | undefined) ?? 'begin';
      setScreen(target === 'ritual' ? 'begin' : target);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [closeCard]);

  // Sky follows the screen.
  useEffect(() => {
    const e = engine;
    if (!e) return;
    e.setHighlightMine(false); // stars stay anonymous: yours looks like every other
    e.setFilterTonight(screen === 'sky' && tonight);
    e.setDim(0);
    e.select(sheetId);
  }, [engine, screen, tonight, sheetId]);

  const back = () => history.back();

  /** Ask the server whether this release is free, paid for, or needs paying. */
  const startRitual = async (raw: string) => {
    if (checking) return;
    setChecking(true);
    try {
      const a = await store.getAllowance();
      setAllow(a);
      if (!a.allFree && !a.free && a.credits < 1) {
        go('credits');
        return;
      }
      setRitualText(scrub(raw));
      go('ritual');
    } catch (e) {
      setToast(releaseProblem(e));
    } finally {
      setChecking(false);
    }
  };

  const onRelease = () => {
    const t = text.trim();
    if (!t) return;
    // Care comes first: nobody in crisis should meet a payment screen.
    if (needsCare(t)) {
      go('care');
      return;
    }
    startRitual(t);
  };

  const stars = store.getStars();
  const now = Date.now();
  const sheetStar = sheetId ? stars.find((s) => s.id === sheetId) ?? null : null;
  if (sheetStar) openStarRef.current = sheetStar;
  // One list, keyed by star id, so a card keeps its place in the DOM as it goes from open to fading.
  const cards = [
    ...fading.filter((f) => f.id !== sheetId).map((star) => ({ star, closing: true })),
    ...(sheetId && openStarRef.current?.id === sheetId ? [{ star: sheetStar ?? openStarRef.current, closing: !sheetStar }] : []),
  ];
  // The sky stays tappable while a card is open: tapping another star moves the card to it.
  const interactive = screen === 'begin' || screen === 'sky' || screen === 'forgiveness' || screen === 'pure';

  return (
    <>
      <StarSky
        onReady={setEngine}
        onStarTap={openCard}
        onEmptyTap={closeCard}
        interactive={interactive}
      />

      {screen === 'begin' && (
        <Begin text={text} onText={setText} onRelease={onRelease} onExplore={() => go('sky')} count={store.getCount()} allowance={allow} />
      )}
      {screen === 'care' && <Care onBack={back} onContinue={() => startRitual(text.trim())} />}
      {screen === 'ritual' && (
        <Ritual
          key={ritualText}
          text={ritualText}
          engine={engine}
          release={(t) => store.release(t)}
          onDone={(s) => {
            refreshAllowance();
            setLastStar({ id: s.id, releasedAt: s.releasedAt });
            setText('');
            go('forgiveness');
          }}
          onError={(e) => {
            refreshAllowance();
            if (String((e as Error)?.message).includes('payment_required')) {
              go('credits');
              return;
            }
            setToast(releaseProblem(e));
            go('begin');
          }}
        />
      )}
      {screen === 'forgiveness' && (
        <Forgiveness
          onShare={() => go('share')}
          onClose={() => go('pure')}
          onAnother={() => {
            setText('');
            go('begin');
          }}
        />
      )}
      {screen === 'sky' && (
        <Explore
          tonight={tonight}
          onToggle={setTonight}
          tonightCount={stars.filter((s) => now - s.releasedAt < DAY).length}
          totalCount={stars.length}
          onBack={back}
          onRelease={() => go('begin')}
        />
      )}
      {screen === 'credits' && (
        <Credits
          text={text.trim()}
          onBack={back}
          onPaid={async () => {
            try {
              // Test mode: the server adds the credit. Live payments will be verified server-side instead.
              setAllow(await store.addTestCredit());
              await startRitual(text.trim());
            } catch (e) {
              setToast(releaseProblem(e));
            }
          }}
        />
      )}
      {screen === 'pure' && (
        <PureSky
          onWrite={() => {
            setText('');
            go('begin');
          }}
        />
      )}
      {screen === 'share' && <Share star={lastStar} onBack={back} onSky={() => go('sky')} />}

      {cards.map(({ star, closing }) => (
        <StarCard
          key={star.id}
          star={star}
          engine={engine}
          closing={closing}
          onClose={() => star.id === sheetRef.current && closeCard()}
          onGone={() => {
            setFading((f) => f.filter((x) => x.id !== star.id));
            // a star that vanished while open (reported / fallen)
            if (star.id === sheetRef.current) {
              sheetRef.current = null;
              setSheetId(null);
            }
          }}
          onCandle={async () => {
            const r = await pay(CANDLE_PRICE.amount, CANDLE_PRICE.currency, `candle-${star.id}`);
            if (r.ok) await store.lightCandle(star.id);
          }}
          onReport={async () => {
            closeCard();
            await store.report(star.id);
            setToast('Thank you. It’s hidden while we look at it.');
          }}
        />
      ))}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 'max(18px, env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            maxWidth: 'calc(100vw - 48px)',
            padding: '12px 18px',
            borderRadius: 16,
            background: 'rgba(8,8,18,.92)',
            border: '1px solid rgba(200,169,110,.35)',
            fontFamily: F.serif,
            fontSize: 17,
            fontStyle: 'italic',
            color: C.textBright,
            textAlign: 'center',
            animation: 'rl-fade-up .4s ease both',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
