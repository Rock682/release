import { useEffect, useState, type ReactNode } from 'react';
import { C, F, T } from '../theme';
import { CARD_LINES, downloadImage, renderCard, shareImage, shareText, siteUrl, type CardFormat } from '../lib/shareCard';
import { DownloadIcon, GoldButton, LinkIcon, Live, Mono, Screen, ShareIcon, TextButton, TopBar } from '../ui/kit';

interface Props {
  star: { id: string; releasedAt: number } | null;
  onBack: () => void;
  onSky: () => void;
}

const FORMATS: { id: CardFormat; name: string; hint: string }[] = [
  { id: 'story', name: 'STORY', hint: 'Status · Stories · TikTok' },
  { id: 'square', name: 'SQUARE', hint: 'Feed · Messages' },
];

/** One beautiful card for every social app. The person's words are never on it. */
export default function Share({ star, onBack, onSky }: Props) {
  const [format, setFormat] = useState<CardFormat>('story');
  const [line, setLine] = useState(CARD_LINES[0]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const seed = star?.id ?? 'the-release';
  const releasedAt = star?.releasedAt ?? Date.now();
  const link = siteUrl();

  // Redraw the card whenever the choice changes.
  useEffect(() => {
    let cancelled = false;
    let made = '';
    setBlob(null);
    renderCard({ format, line, seed, releasedAt })
      .then((b) => {
        if (cancelled) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
      })
      .catch(() => setStatus('The card couldn’t be drawn on this device.'));
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [format, line, seed, releasedAt]);

  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(''), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const share = async () => {
    if (!blob || busy) return;
    setBusy(true);
    const r = await shareImage(blob, line);
    setBusy(false);
    if (r === 'shared') setStatus('Shared. Thank you for letting others know.');
    else if (r === 'unsupported') {
      downloadImage(blob);
      setStatus('Saved to your device. Post it from your gallery to any app.');
    }
  };

  const story = format === 'story';

  return (
    <Screen label="Share your star" scroll style={{ gap: 14 }}>
      <TopBar onBack={onBack} title="SHARE" />
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 500, textShadow: T.title, fontStyle: 'italic', color: C.goldPale }}>Share your star</h1>
        <p style={{ margin: '4px 0 0', fontSize: 17, color: C.textSoft }}>Your words stay private. Only your star travels.</p>
      </div>

      {/* live preview */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
        <div
          style={{
            position: 'relative',
            height: story ? 'min(40vh, 360px)' : undefined,
            width: story ? undefined : 'min(64vw, 280px)',
            aspectRatio: story ? '9 / 16' : '1 / 1',
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(200,169,110,.45)',
            boxShadow: '0 24px 60px rgba(0,0,0,.65), 0 0 50px rgba(200,169,110,.2)',
            background: '#05060f',
            animation: 'rl-float 6s ease-in-out infinite',
            transition: 'width .4s ease, height .4s ease',
          }}
        >
          {url && blob ? (
            <img src={url} alt={`Share card: a golden star in a galaxy with the words “${line}”`} style={{ width: '100%', height: '100%', display: 'block', animation: 'rl-fade-in .5s ease both' }} />
          ) : (
            <div aria-label="Drawing your card" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, #05060f 30%, #12131f 50%, #05060f 70%)', backgroundSize: '200% 100%', animation: 'rl-shimmer 1.4s linear infinite' }} />
          )}
        </div>
      </div>

      <Live style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* size */}
        <div role="radiogroup" aria-label="Card size" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {FORMATS.map((f) => {
            const on = f.id === format;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setFormat(f.id)}
                style={{
                  minHeight: 54,
                  borderRadius: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  border: on ? `1px solid ${C.gold}` : '1px solid rgba(200,169,110,.22)',
                  background: on ? 'rgba(200,169,110,.12)' : 'rgba(8,8,18,.6)',
                  color: on ? '#F4E3BC' : C.textSoft,
                }}
              >
                <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: '.22em' }}>{f.name}</span>
                <span style={{ fontFamily: F.serif, fontSize: 14, fontStyle: 'italic', color: C.textDim }}>{f.hint}</span>
              </button>
            );
          })}
        </div>

        {/* words on the card */}
        <div role="radiogroup" aria-label="Words on the card" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -24px', padding: '2px 24px', scrollbarWidth: 'none' }}>
          {CARD_LINES.map((l) => {
            const on = l === line;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setLine(l)}
                style={{
                  minHeight: 40,
                  flex: 'none',
                  whiteSpace: 'nowrap',
                  padding: '0 14px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontFamily: F.serif,
                  fontSize: 16,
                  fontStyle: 'italic',
                  border: on ? `1px solid ${C.goldBright}` : '1px solid rgba(200,169,110,.25)',
                  background: on ? 'rgba(243,201,120,.14)' : 'transparent',
                  color: on ? C.goldPale : C.textSoft,
                }}
              >
                {l}
              </button>
            );
          })}
        </div>

        <GoldButton onClick={share} disabled={!blob || busy} style={{ marginTop: 4 }}>
          <ShareIcon />
          {busy ? 'OPENING…' : 'SHARE MY STAR'}
        </GoldButton>
        <Mono as="p" style={{ textAlign: 'center', letterSpacing: '.1em', lineHeight: 1.7 }}>
          WHATSAPP · INSTAGRAM · TIKTOK · SNAPCHAT · FACEBOOK
        </Mono>

        <div style={{ display: 'grid', gridTemplateColumns: link ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 10 }}>
          <SmallButton onClick={() => blob && (downloadImage(blob), setStatus('Saved. Post it as a story or status from your gallery.'))} disabled={!blob}>
            <DownloadIcon />
            SAVE IMAGE
          </SmallButton>
          {link && (
            <SmallButton
              onClick={() => {
                navigator.clipboard
                  ?.writeText(shareText(line))
                  .then(() => setStatus('Link copied. Paste it anywhere.'))
                  .catch(() => setStatus('Couldn’t copy the link on this device.'));
              }}
            >
              <LinkIcon />
              COPY LINK
            </SmallButton>
          )}
        </div>

        <p role="status" style={{ margin: 0, minHeight: 22, textAlign: 'center', fontSize: 16, fontStyle: 'italic', color: C.goldPale }}>
          {status}
        </p>
      </Live>

      <Live style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
        <TextButton onClick={onSky}>Not now, take me to the sky</TextButton>
      </Live>
    </Screen>
  );
}

function SmallButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 48,
        borderRadius: 24,
        border: '1px solid rgba(200,169,110,.45)',
        background: 'rgba(2,3,10,.5)',
        color: C.text,
        fontFamily: F.mono,
        fontSize: 10,
        letterSpacing: '.18em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
