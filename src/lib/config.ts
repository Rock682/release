/**
 * Supabase connection. The publishable key is meant to be public: it can only
 * call the six functions the database exposes (all tables are locked).
 * Never put the service_role key here.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://choynspqgiijvshdhjny.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_MmyEcahlXIX_mVDe888zCQ_vq1gPW5d';
