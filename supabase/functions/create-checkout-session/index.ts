// Starts a Stripe Checkout subscription for the signed-in grown-up. The app sends { plan } and gets back { url } to open.
// The browser sends only a plan name; the price is looked up HERE by its Stripe lookup key (cct_monthly, cct_yearly,
// cct_lifetime), so the browser never sends a price id and test and live mode use the same code.
import { adminClient, APP_URL, ACCESS_STATUSES, customerForUser, json, preflight, stripeClient, userFromRequest } from '../_shared/common.ts';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await userFromRequest(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);

  const body = await req.json().catch(() => ({}));
  const plan = ['monthly', 'yearly', 'lifetime'].includes(body.plan) ? body.plan as string : 'monthly';

  // Already subscribed: send them to manage it instead of paying twice.
  const { data: row } = await adminClient().from('entitlements').select('status').eq('user_id', user.id).maybeSingle();
  if (row && ACCESS_STATUSES.includes(row.status)) return json({ error: 'already_subscribed' }, 409);

  const stripe = stripeClient();
  const found = await stripe.prices.list({ lookup_keys: [`cct_${plan}`], active: true, limit: 1 });
  const price = found.data[0]?.id;
  if (!price) return json({ error: 'plan_not_available' }, 400);
  const lifetime = plan === 'lifetime';
  const customer = await customerForUser(stripe, user);
  const session = await stripe.checkout.sessions.create({
    mode: lifetime ? 'payment' : 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    // Stripe Tax: collects tax only where a registration exists (docs/STRIPE.md, "Tax").
    automatic_tax: { enabled: true },
    billing_address_collection: 'auto',
    customer_update: { address: 'auto', name: 'auto' },
    allow_promotion_codes: true,
    ...(lifetime ? {
      invoice_creation: { enabled: true },
      payment_intent_data: { metadata: { supabase_user_id: user.id, plan } },
    } : {
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
    }),
    metadata: { supabase_user_id: user.id, plan },
    success_url: `${APP_URL}/#/unlock?checkout=success`,
    cancel_url: `${APP_URL}/#/unlock?checkout=cancelled`,
  });
  return json({ url: session.url });
});
