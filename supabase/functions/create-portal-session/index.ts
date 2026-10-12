// Opens the Stripe Customer Portal (change card, cancel, see invoices) for the signed-in grown-up. Returns { url }.
import { adminClient, APP_URL, json, preflight, stripeClient, userFromRequest } from '../_shared/common.ts';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await userFromRequest(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);

  const { data: row } = await adminClient().from('entitlements').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!row?.stripe_customer_id) return json({ error: 'no_subscription' }, 404);

  const session = await stripeClient().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${APP_URL}/#/unlock`,
  });
  return json({ url: session.url });
});
