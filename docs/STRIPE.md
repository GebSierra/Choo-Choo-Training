# Paid access with Stripe (branch `claude/stripe-billing`)

Status: backend written and sandbox products created; NOT deployed yet; paywall screen being built.
Nothing here touches the lessons, the Home or `js/config.js`. Everything starts in a Stripe **sandbox**.

## How it works

```
Grown-up taps "Unlock" (app, signed in)
  -> Supabase function create-checkout-session  (checks the login, picks the price from a secret, makes the Checkout)
  -> Stripe-hosted Checkout page (card, Stripe Tax)
  -> Stripe webhook -> Supabase function stripe-webhook -> public.entitlements row (access = true)
  -> the app reads its own entitlements row (row-level security: only your own) and unlocks
Manage / cancel: app -> create-portal-session -> Stripe Customer Portal.
```

The app never decides who has paid: only the webhook (service role) can write `entitlements`. Players read it, nothing more.

| File | What it is |
|---|---|
| `supabase/billing.sql` | `entitlements` and `stripe_events` tables + row-level security. Run once in the SQL Editor. |
| `supabase/functions/create-checkout-session` | Starts a subscription Checkout for the signed-in user. |
| `supabase/functions/create-portal-session` | Opens the Customer Portal. |
| `supabase/functions/stripe-webhook` | Subscription lifecycle, full refunds, disputes. Checks Stripe's signature; each event handled once. |
| `supabase/functions/_shared/common.ts` | Shared helpers. |
| `supabase/config.toml` | Turns the gateway login check off for these three (each checks for itself). |

Rules used by the webhook:
- Access stays on for `active`, `trialing` and `past_due` (Stripe retries the card for a while; the grown-up keeps access meanwhile).
- A **full refund** locks access (`refunded`) and cancels the subscription. A partial refund changes nothing.
- A **dispute** locks access (`disputed`). If the dispute is **won**, access returns from the subscription's real status; lost or accepted stays locked.
- A new paid subscription replaces a `refunded` / `disputed` state.

## Pricing (owner decision 2026-10-12)

| Plan | Price | Stripe lookup key | Kind |
|---|---|---|---|
| Monthly | $8.99 | `cct_monthly` | subscription |
| Yearly | $59.99 (about 44% off monthly) | `cct_yearly` | subscription |
| Lifetime | $147 | `cct_lifetime` | one-time payment (Checkout `payment` mode) |

World 1 is free; no free-trial period is added. Created in the sandbox on 2026-10-12: product `prod_VQh3800JKuL7lP`
("Choo Choo Training - Full Access", tax code `txcd_10000000`, general electronically supplied services: ask your accountant
whether a more specific code fits), prices tax-exclusive (tax is added on top at checkout). The code finds prices by lookup
key, so live mode only needs the same three prices created with the same keys. Customer Portal configured in the sandbox
(cancel at period end, payment method, invoice history).
Lifetime: the webhook sets `status = 'lifetime'`, `access = true`; later subscription events never change it; a full refund or
a lost dispute locks it. Lifetime buyers have receipts but no subscription to manage in the portal.

## Tax (Stripe Tax)

Checkout is created with `automatic_tax: { enabled: true }`. Stripe Tax collects tax only in places where you have a **registration**; until then it collects none, so the checks below matter before you take real money.

Sandbox today (checked 2026-10-12): Stripe Tax status **pending**, missing **head office address**; no tax registrations; no products.

Owner checklist:
1. Dashboard (sandbox) > Settings > Tax: enter your head office address; set the default product tax category for digital subscriptions (software as a service / "digital goods", pick what fits your lawyer's advice); set default tax behaviour (exclusive = tax added on top, inclusive = tax inside the price; I will create prices to match).
2. Dashboard > Tax > **Monitoring**: free threshold monitoring tells you when your sales in a state or country require registering. Look at it monthly at first.
3. Add registrations only where you must collect (Dashboard > Tax > Registrations). Stripe Tax does not register you; your accountant or Stripe's registration service does.
4. Repeat steps 1 to 3 in live mode before launch (sandbox and live are separate).
5. Optional to look at: **Stripe Managed Payments** (Stripe acts as seller of record and handles tax for digital-only subscriptions). It has eligibility rules (country, direct account); check your Dashboard for availability. It would change the Checkout setup, so decide before live.

## Owner setup, in the sandbox (about 20 minutes, after the price is chosen)

Never paste a Stripe secret key, a restricted key or the webhook secret into this repo or into a chat. They go only into Supabase secrets.

1. Supabase > SQL Editor: run `supabase/billing.sql`.
2. Stripe sandbox > Developers > API keys: create a **restricted key** (write: Checkout Sessions, Customers, Customer portal Sessions, Subscriptions; read: Prices, Charges; everything else none). Keep the value to yourself.
3. Install the Supabase CLI, `supabase login`, `supabase link --project-ref nwlfjqcynfoyjnepiuze`.
4. Set the secrets in your own terminal (not in a chat):
   `supabase secrets set STRIPE_SECRET_KEY=rk_test_... APP_URL=https://app.choochootraining.com`
5. `supabase functions deploy stripe-webhook create-checkout-session create-portal-session`
6. Stripe sandbox > Developers > Webhooks > Add endpoint: URL `https://nwlfjqcynfoyjnepiuze.supabase.co/functions/v1/stripe-webhook`, events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `invoice.payment_failed`. Copy its signing secret into Supabase: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
7. Stripe sandbox > Settings > Billing > Customer portal: turn on cancel at period end, update payment method, invoice history. Turn on Smart Retries and failed-payment emails (Billing > Revenue recovery).
8. Test with card 4242 4242 4242 4242: check `entitlements.access` becomes true; refund it in the Dashboard and check it locks.

## Known gaps / decisions still open

- **Deleting an account** (`delete_my_account` in `supabase/schema.sql`) removes the login and, by cascade, `entitlements`, but does NOT cancel the Stripe subscription. Before live: cancel the subscription first (a small function) so nobody is charged after deleting. Not done, because it edits existing account code; say when.
- **Apple / Google store builds** (docs/APP-STORE.md): the stores usually require their own in-app purchase for unlocking digital content in the app, and restrict links out to web payment, especially in Kids categories. This web billing is for the web app only. VERIFY the current rules before any store submission.
- **Children's privacy**: the purchase screen is for the grown-up only (the existing number gate); Stripe holds the card details, the app holds none. Lawyer review (OWNER-TODO) should cover it.
- The webhook, Checkout and Portal functions were written against the Stripe docs but not yet run: they need the sandbox deploy above and the test purchase in step 8 before anyone trusts them.
- Still to build: the "Unlock" grown-up screen, the app's read of its entitlements row (`GET /rest/v1/entitlements?select=*`), and the World 1 free / later worlds paid gate (a new `js/billing.js` plus the smallest possible hook in the world/lesson open path, to be agreed with the main-branch session).
