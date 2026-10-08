// Grown-up accounts (docs/BACKEND.md). Leave both empty and accounts are OFF: the app behaves as it always did.
// The project URL and the publishable key (Supabase's new name for the anon key) are public by design: row-level security
// protects the data, so both are safe to commit. NEVER put the secret / service_role key here or anywhere in this repo.
export const SUPABASE_URL = 'https://nwlfjqcynfoyjnepiuze.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_WGo_fuv0XBbzBm-6s32zJg_oa7-Vw_K';
// Sign-in buttons shown above the email form (Supabase OAuth providers that are switched on). Apple comes later.
export const OAUTH_PROVIDERS = ['google'];
// Where the password reset email sends the grown-up (must also be in Supabase > Authentication > URL Configuration).
export const SITE_URL = 'https://app.choochootraining.com/';
// The app lives at APP_ORIGIN. Progress is saved per address, so a visit to an old address carries it over (js/handoff.js, docs/DOMAIN-MOVE.md).
export const APP_ORIGIN = 'https://app.choochootraining.com';
export const OLD_HOSTS = ['choochootraining.com', 'www.choochootraining.com'];
// Off until app.choochootraining.com is set up: only then may the old address send visitors over.
export const HANDOFF_LIVE = true;
