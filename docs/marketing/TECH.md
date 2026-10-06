# Founding Families: technical sketch

For the app session to pick up later. Nothing here is built yet. The app is static (GitHub Pages, offline-first), so codes need a small server piece.

## Pieces

| Piece | Suggestion |
|---|---|
| Backend | Cloudflare Worker + KV, or Supabase (free tier is enough for launch) |
| Payments | Stripe Checkout for Monthly / Lifetime; Stripe Promotion Codes or our own code table for Founding passes |
| Parent identity | Email magic link; parent email only (COPPA) |
| Offline | Store the signed licence on the device so the app still works offline |

## Data

```
licences:  id, parent_email, type (founding | ticket | lifetime | monthly),
           created_at, source (social post URL or ticket id), stripe_customer_id
tickets:   code, owner_licence_id, redeemed_by, redeemed_at, expires_at
seats:     founding_total = 100, founding_used
```

## Flows

1. **Founding code** (manual at launch): we create a code in the admin list → parent enters it in Grownups → server checks it, decrements seats, creates a licence, creates 3 tickets.
2. **Golden ticket**: link `choochootraining.com/t/CODE` → opens the app → parent enters email → licence of type `ticket`. Rejected after `expires_at` or if already used.
3. **Paid**: Stripe Checkout → webhook creates the licence.
4. **Check**: the app asks the server for a signed licence once, caches it, and re-checks occasionally when online. Lessons 1–5 never need a licence.

## In-app changes needed

- Lock after lesson 5 unless a licence is present.
- Post-lesson-5 prompt and share sheet (`navigator.share`).
- Grownups → Founding Family: enter code, see tickets.
- Founding Family badge + conductor's hat in the character creator.
- Public seat counter endpoint for the landing page.

## Admin

A simple private page or spreadsheet: list of posts, codes sent, seats left, ticket redemptions, last-active date (for the reciprocity email).
