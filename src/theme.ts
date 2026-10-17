// Design tokens shared by every screen.
export const C = {
  bg: '#02030a',
  text: '#E8DCC8',
  textBright: '#F1E6D2',
  textSoft: 'rgba(232,220,200,.78)',
  textDim: 'rgba(232,220,200,.62)',
  gold: '#C8A96E',
  goldBright: '#F3C978',
  goldPale: '#F2DDAE',
  goldLine: 'rgba(200,169,110,.45)',
  goldFaint: 'rgba(200,169,110,.22)',
  ink: '#140F06',
  panel: 'rgba(8,8,18,.72)',
};

export const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  mono: "'Space Mono', ui-monospace, monospace",
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Dark edge + soft glow so titles stay readable over the bright galaxy. */
export const T = {
  title: '0 2px 14px rgba(0,0,0,.95), 0 0 3px rgba(0,0,0,.85), 0 0 42px rgba(240,200,130,.32)',
  body: '0 1px 10px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.8)',
};
