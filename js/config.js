// Grown-up accounts (docs/BACKEND.md). Leave both empty and accounts are OFF: the app behaves as it always did.
// The anon key is meant to be public (row-level security protects the data), so it is safe to commit.
export const SUPABASE_URL = ''; // like https://abcdefgh.supabase.co
export const SUPABASE_ANON_KEY = '';
// Where the password reset email sends the grown-up (must also be in Supabase > Authentication > URL Configuration).
export const SITE_URL = 'https://app.choochootraining.com/';
// The app lives at APP_ORIGIN. Progress is saved per address, so a visit to an old address carries it over (js/handoff.js, docs/DOMAIN-MOVE.md).
export const APP_ORIGIN = 'https://app.choochootraining.com';
export const OLD_HOSTS = ['choochootraining.com', 'www.choochootraining.com'];
// Off until app.choochootraining.com is set up: only then may the old address send visitors over.
export const HANDOFF_LIVE = true;
