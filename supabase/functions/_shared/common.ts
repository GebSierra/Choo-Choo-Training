// Shared helpers for the billing Edge Functions. Secrets come from Supabase secrets (Deno.env), never from the repo.
import Stripe from 'npm:stripe@18';
import { createClient } from 'npm:@supabase/supabase-js@2';

export const APP_URL = (Deno.env.get('APP_URL') ?? 'https://app.choochootraining.com').replace(/\/$/, '');

export function stripeClient(): Stripe {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
}

// Service-role client: bypasses row-level security. Only used inside functions, never sent to the browser.
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders }) : null;
}

// The signed-in grown-up from the Authorization header, or null.
export async function userFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

// Statuses that keep the paid part unlocked ('lifetime' = one-time purchase, set by the webhook). past_due keeps access while Stripe retries the card (Smart Retries).
export const ACCESS_STATUSES = ['active', 'trialing', 'past_due', 'lifetime'];

// Find or create the Stripe customer for this user, remembering it in the entitlements row.
export async function customerForUser(stripe: Stripe, user: { id: string; email: string | null }): Promise<string> {
  const db = adminClient();
  const { data: row } = await db.from('entitlements').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (row?.stripe_customer_id) return row.stripe_customer_id;
  const customer = await stripe.customers.create(
    { email: user.email ?? undefined, metadata: { supabase_user_id: user.id } },
    { idempotencyKey: `customer-${user.id}` },
  );
  await db.from('entitlements').upsert({ user_id: user.id, stripe_customer_id: customer.id, updated_at: new Date().toISOString() });
  return customer.id;
}
