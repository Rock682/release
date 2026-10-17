import type { CSSProperties, ReactNode } from 'react';
import { C, F, T } from '../theme';

/** Full-height column, phone-width, centred on larger screens. */
export function Screen({ children, style, label, scroll }: { children: ReactNode; style?: CSSProperties; label: string; scroll?: boolean }) {
  return (
    <main
      aria-label={label}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 'max(20px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))',
          fontFamily: F.serif,
          color: C.text,
          animation: 'rl-fade-in .6s ease both',
          // Scrollable screens take taps themselves (stars behind them can't be picked).
          ...(scroll ? { overflowY: 'auto', pointerEvents: 'auto', WebkitOverflowScrolling: 'touch' } : null),
          ...style,
        }}
      >
        {children}
      </div>
    </main>
  );
}

/** Wrap controls so they receive taps (the screen layer itself lets taps fall through to the sky). */
export function Live({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ pointerEvents: 'auto', ...style }}>{children}</div>;
}

export function Mono({ children, style, as = 'span' }: { children: ReactNode; style?: CSSProperties; as?: 'span' | 'p' }) {
  const Tag = as;
  return (
    <Tag style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '.18em', color: C.textDim, margin: 0, ...style }}>
      {children}
    </Tag>
  );
}

export function Rule() {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'block', width: 48, height: 1, background: 'linear-gradient(90deg,transparent,rgba(200,169,110,.7),transparent)' }}
    />
  );
}

const baseBtn: CSSProperties = {
  width: '100%',
  minHeight: 54,
  borderRadius: 28,
  fontFamily: F.mono,
  fontSize: 11,
  letterSpacing: '.24em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
  transition: 'background .3s, border-color .3s, color .3s, opacity .3s',
  pointerEvents: 'auto',
};

export function GoldButton(props: { children: ReactNode; onClick?: () => void; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        ...baseBtn,
        border: 'none',
        background: C.gold,
        color: C.ink,
        opacity: props.disabled ? 0.5 : 1,
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}

export function GhostButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  glowing?: boolean;
  style?: CSSProperties;
}) {
  const on = !props.disabled;
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        ...baseBtn,
        letterSpacing: '.4em',
        border: `1px solid ${on ? C.gold : 'rgba(200,169,110,.3)'}`,
        background: on ? 'rgba(200,169,110,.10)' : 'rgba(2,3,10,.35)',
        color: on ? '#F4E3BC' : 'rgba(200,169,110,.6)',
        cursor: on ? 'pointer' : 'default',
        animation: props.glowing && on ? 'rl-pulse 2.4s ease-in-out infinite' : 'none',
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}

export function TextButton(props: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        minHeight: 44,
        padding: '0 12px',
        background: 'none',
        border: 'none',
        fontFamily: F.serif,
        fontSize: 18,
        fontStyle: 'italic',
        color: C.textSoft,
        cursor: 'pointer',
        pointerEvents: 'auto',
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}

export function IconButton(props: { label: string; onClick: () => void; children: ReactNode; bordered?: boolean }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: props.bordered ? '1px solid rgba(200,169,110,.32)' : 'none',
        color: C.gold,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
    >
      {props.children}
    </button>
  );
}

export function TopBar({ onBack, title, right }: { onBack?: () => void; title?: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      {onBack ? (
        <IconButton label="Back" onClick={onBack}>
          <BackIcon />
        </IconButton>
      ) : (
        <span style={{ width: 44 }} />
      )}
      <Brand>{title ?? 'THE RELEASE'}</Brand>
      {right ?? <span style={{ width: 44 }} />}
    </div>
  );
}

/* Icons: thin strokes to match the type. */
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};
export const BackIcon = () => (
  <svg {...iconProps}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const CloseIcon = () => (
  <svg {...iconProps} width={18} height={18}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const StarIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3l2.2 5.6L20 9.3l-4.5 3.8 1.4 5.9L12 15.9 7.1 19l1.4-5.9L4 9.3l5.8-.7z" />
  </svg>
);
export const FlameIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...iconProps} width={size} height={size} strokeWidth={1.6}>
    <path d="M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8z" />
  </svg>
);
export const PhoneIcon = () => (
  <svg {...iconProps} width={16} height={16} strokeWidth={1.6}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);
export const FrameIcon = () => (
  <svg {...iconProps} width={16} height={16} strokeWidth={1.5}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 15l3-3 2 2 3-3" />
  </svg>
);

/** A soft dark pool behind text that sits over the bright galaxy core. */
export function Scrim({ top = '50%', height = '46%', strength = 0.62 }: { top?: string; height?: string; strength?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '50%',
        top,
        width: 'min(150vw, 720px)',
        height,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(ellipse closest-side, rgba(1,2,8,${strength}), rgba(1,2,8,${strength * 0.55}) 55%, transparent)`,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}

export const ShareIcon = () => (
  <svg {...iconProps} width={16} height={16} strokeWidth={1.6}>
    <path d="M12 3v12" />
    <path d="M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);
export const DownloadIcon = () => (
  <svg {...iconProps} width={15} height={15} strokeWidth={1.6}>
    <path d="M12 4v11" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);
export const LinkIcon = () => (
  <svg {...iconProps} width={15} height={15} strokeWidth={1.6}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </svg>
);

/** The name at the top of every screen: large, bright and easy to read. */
export function Brand({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return (
    <span
      style={{
        fontFamily: F.serif,
        fontSize: 21,
        fontWeight: 500,
        letterSpacing: '.32em',
        paddingLeft: '.32em',
        color: dim ? 'rgba(242,221,174,.75)' : '#F2DDAE',
        textShadow: T.title,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
