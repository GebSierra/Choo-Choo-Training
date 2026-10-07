// Grown-up accounts (docs/BACKEND.md). Leave both empty and accounts are OFF: the app behaves as it always did.
// The anon key is meant to be public (row-level security protects the data), so it is safe to commit.
export const SUPABASE_URL = ''; // like https://abcdefgh.supabase.co
export const SUPABASE_ANON_KEY = '';
// Where the password reset email sends the grown-up (must also be in Supabase > Authentication > URL Configuration).
export const SITE_URL = 'https://choochootraining.com/';
