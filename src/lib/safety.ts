/**
 * First-line safety checks that run in the browser. A backend should repeat
 * them (and can add a proper moderation model); never trust the client alone.
 */

// Phrases that suggest someone may be thinking of harming themselves.
// Kept deliberately explicit to avoid stopping ordinary regrets.
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+my\s*self\b/i,
  /\bend(ing)?\s+(it\s+all|my\s+life|everything)\b/i,
  /\b(want|wanna|going|plan(ning)?)\s+to\s+die\b/i,
  /\bsuicid(e|al)\b/i,
  /\bself[\s-]?harm(ing)?\b/i,
  /\b(cut|cutting|hurt|hurting)\s+my\s*self\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\b(khudkushi|aatmahatya|atmahatya)\b/i,
  /\bmar\s+jaana?\s+chahta\b/i,
  /\bmar\s+jaana?\s+chahti\b/i,
];

export function needsCare(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

/**
 * Remove details that could identify someone before a star is shown publicly:
 * phone numbers, emails, links and @handles. Names can't be detected reliably
 * here; that needs server-side moderation.
 */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '[link]')
    .replace(/(?:\+?\d[\s-]?){8,}\d/g, '[number]')
    .replace(/(^|\s)@\w{2,}/g, '$1[handle]')
    .replace(/\s+/g, ' ')
    .trim();
}

export const MAX_CHARS = 120;
