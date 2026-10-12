// Starts a Stripe Checkout subscription for the signed-in grown-up. The app sends { plan } and gets back { url } to open.
// Prices are chosen HERE from Supabase secrets (STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY); the browser never sends a price id.
import { adminClient, APP_URL, ACCESS_STATUSES, customerForUser, json, preflight, stripeClient, userFromRequest } from '../_shared/common.ts';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await userFromRequest(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);

  const body = await req.json().catch(() => ({}));
  const plan = body.plan === 'yearly' ? 'yearly' : 'monthly';
  const price = Deno.env.get(plan === 'yearly' ? 'STRIPE_PRICE_YEARLY' : 'STRIPE_PRICE_MONTHLY');
  if (!price) return json({ error: 'plan_not_available' }, 400);

  // Already subscribed: send them to manage it instead of paying twice.
  const { data: row } = await adminClient().from('entitlements').select('status').eq('user_id', user.id).maybeSingle();
  if (row && ACCESS_STATUSES.includes(row.status)) return json({ error: 'already_subscribed' }, 409);

  const stripe = stripeClient();
  const customer = await customerForUser(stripe, user);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    // Stripe Tax: collects tax only where a registration exists (docs/STRIPE.md, "Tax").
    automatic_tax: { enabled: true },
    billing_address_collection: 'auto',
    customer_update: { address: 'auto', name: 'auto' },
    allow_promotion_codes: true,
    subscription_data: { metadata: { supabase_user_id: user.id, plan } },
    metadata: { supabase_user_id: user.id, plan },
    success_url: `${APP_URL}/#/unlock?checkout=success`,
    cancel_url: `${APP_URL}/#/unlock?checkout=cancelled`,
  });
  return json({ url: session.url });
});
