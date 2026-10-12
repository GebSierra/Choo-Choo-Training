// Stripe webhook: keeps public.entitlements in step with the subscription. Verifies Stripe's signature, handles each
// event once (public.stripe_events), and answers 200 only after the row is written, so Stripe retries a failure.
//
// Events to send to this endpoint (docs/STRIPE.md): checkout.session.completed, checkout.session.async_payment_succeeded, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted, charge.refunded, charge.dispute.created,
// charge.dispute.closed, invoice.payment_failed.
import Stripe from 'npm:stripe@18';
import { ACCESS_STATUSES, adminClient, stripeClient } from '../_shared/common.ts';

const stripe = stripeClient();
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const db = adminClient();

// Webhook-only states that override the subscription status and always lock the paid part.
const LOCKED = ['refunded', 'disputed'];

function periodEnd(sub: Stripe.Subscription): string | null {
  // Newer API versions keep the period on the items; older ones on the subscription.
  const secs = sub.items?.data?.[0]?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return secs ? new Date(secs * 1000).toISOString() : null;
}

async function userIdForCustomer(customerId: string, sub?: Stripe.Subscription): Promise<string | null> {
  const { data } = await db.from('entitlements').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
  if (data?.user_id) return data.user_id;
  if (sub?.metadata?.supabase_user_id) return sub.metadata.supabase_user_id;
  const customer = await stripe.customers.retrieve(customerId);
  return 'deleted' in customer ? null : (customer.metadata?.supabase_user_id ?? null);
}

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId = await userIdForCustomer(customerId, sub);
  if (!userId) { console.error('no user for customer', customerId); return; }
  const { data: current } = await db.from('entitlements').select('status').eq('user_id', userId).maybeSingle();
  // A lifetime purchase is never changed by a subscription event (e.g. an old monthly plan ending).
  if (current?.status === 'lifetime') return;
  // A refund or dispute outranks the subscription's own status until a new subscription replaces it.
  const keepLocked = current && LOCKED.includes(current.status) && sub.status !== 'active' && sub.status !== 'trialing';
  const status = keepLocked ? current!.status : sub.status;
  const { error } = await db.from('entitlements').upsert({
    user_id: userId,
    status,
    access: ACCESS_STATUSES.includes(status),
    plan: sub.metadata?.plan ?? null,
    current_period_end: periodEnd(sub),
    cancel_at_period_end: sub.cancel_at_period_end,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function grantLifetime(s: Stripe.Checkout.Session) {
  const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
  const userId = s.metadata?.supabase_user_id ?? s.client_reference_id ?? (customerId ? await userIdForCustomer(customerId) : null);
  if (!userId || !customerId) { console.error('no user for lifetime session', s.id); return; }
  const { error } = await db.from('entitlements').upsert({
    user_id: userId, status: 'lifetime', access: true, plan: 'lifetime', current_period_end: null,
    cancel_at_period_end: false, stripe_customer_id: customerId, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function lock(customerId: string, status: 'refunded' | 'disputed') {
  const userId = await userIdForCustomer(customerId);
  if (!userId) { console.error('no user for customer', customerId); return; }
  const { error } = await db.from('entitlements')
    .update({ status, access: false, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw error;
}

async function customerOfCharge(chargeId: string): Promise<string | null> {
  const charge = await stripe.charges.retrieve(chargeId);
  return typeof charge.customer === 'string' ? charge.customer : (charge.customer?.id ?? null);
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === 'payment' && s.payment_status === 'paid' && s.metadata?.plan === 'lifetime') await grantLifetime(s);
      if (s.mode === 'subscription' && s.subscription) {
        await syncSubscription(await stripe.subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id));
      }
      break;
    }
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === 'payment' && s.metadata?.plan === 'lifetime') await grantLifetime(s);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'charge.refunded': {
      const c = event.data.object as Stripe.Charge;
      // Only a full refund takes access away; a partial refund (goodwill) leaves the subscription as it is.
      if (c.refunded && c.customer) {
        const customerId = typeof c.customer === 'string' ? c.customer : c.customer.id;
        await lock(customerId, 'refunded');
        // Stop future billing too.
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active' });
        for (const s of subs.data) await stripe.subscriptions.cancel(s.id);
      }
      break;
    }
    case 'charge.dispute.created': {
      const d = event.data.object as Stripe.Dispute;
      const customerId = await customerOfCharge(typeof d.charge === 'string' ? d.charge : d.charge.id);
      if (customerId) await lock(customerId, 'disputed');
      break;
    }
    case 'charge.dispute.closed': {
      const d = event.data.object as Stripe.Dispute;
      if (d.status !== 'won') break; // lost or accepted: stays locked
      const customerId = await customerOfCharge(typeof d.charge === 'string' ? d.charge : d.charge.id);
      if (!customerId) break;
      const { data: row } = await db.from('entitlements').select('plan')
        .eq('stripe_customer_id', customerId).eq('status', 'disputed').maybeSingle();
      if (!row) break;
      if (row.plan === 'lifetime') {
        await db.from('entitlements').update({ status: 'lifetime', access: true, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);
        break;
      }
      await db.from('entitlements').update({ status: 'none' }).eq('stripe_customer_id', customerId);
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
      if (subs.data[0]) await syncSubscription(subs.data[0]);
      break;
    }
    case 'invoice.payment_failed':
      // The subscription.updated event that follows sets past_due; nothing to do here (Stripe emails the customer).
      break;
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return new Response('missing signature', { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error('bad signature', (err as Error).message);
    return new Response('bad signature', { status: 400 });
  }

  // Claim the event; a duplicate delivery stops here.
  const { error: claim } = await db.from('stripe_events').insert({ id: event.id, type: event.type });
  if (claim) {
    if (claim.code === '23505') return new Response('already handled', { status: 200 });
    console.error('claim failed', claim.message);
    return new Response('error', { status: 500 });
  }
  try {
    await handle(event);
  } catch (err) {
    console.error('handler failed', event.type, (err as Error).message);
    await db.from('stripe_events').delete().eq('id', event.id); // let Stripe's retry run it again
    return new Response('error', { status: 500 });
  }
  return new Response('ok', { status: 200 });
});
