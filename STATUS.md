# STATUS — Cart Recovery Popup app

**Date:** 2026-10-16
**Location:** `~/workspace/apps/cart-recovery-popup/`
**State:** Codebase complete and validated. Not yet deployed or submitted.

## What's built

- [x] Full Remix app scaffold (official `shopify-app-template-remix` structure)
- [x] `shopify.app.toml` — scopes (`write_discounts,read_discounts`), webhook
      subscriptions, app proxy config
- [x] OAuth via `@shopify/shopify-app-remix` (`auth.$.tsx`, `shopify.server.ts`)
- [x] Billing API — $9.99/mo "Cart Recovery Pro", 7-day trial, enforced in
      `app.tsx` layout via `billing.require()` with redirect to `/app/billing`
- [x] All 3 mandatory GDPR webhooks (`webhooks.compliance.tsx`):
      `customers/data_request`, `customers/redact`, `shop/redact` (+ `app/uninstalled`,
      `app/scopes_update`)
- [x] Admin UI (Polaris): dashboard, popup settings form (trigger, delay,
      discount code + %, copy, colors), billing page
- [x] Automatic discount-code creation via Admin API (`discountCodeBasicCreate`)
      when the merchant saves a code that doesn't exist
- [x] Theme app extension: app embed block (`target: body`) + vanilla JS popup
      (exit-intent, timer, once-per-session, click-to-copy code, `/discount/CODE`
      CTA, `prefers-reduced-motion` support, fails silently)
- [x] App proxy config endpoint with HMAC signature verification
- [x] Prisma schema (Session + PopupSettings), SQLite for dev
- [x] Validated: popup JS parses, Liquid schema JSON valid, TOMLs contain
      required sections, package.json deps correct

## What remains (needs user / parent agent)

1. **Partner Dashboard:** create the app entry → fill `client_id`, app URL,
   redirect URLs in `shopify.app.toml` and `.env`
2. **Hosting:** deploy the Remix app to an HTTPS host (Fly.io/Railway/Vercel);
   set `SHOPIFY_APP_URL`, `DATABASE_URL` (Postgres in prod)
3. **`npx prisma db push`** against the production database
4. **`shopify app deploy`** to push the theme app extension
5. **Test install** on `lumen-demo-rz4icdzs.myshopify.com`: activate the app
   embed, trigger the popup, verify the discount applies at checkout
6. **Review assets:** setup screencast (reviewers commonly ask for a video
   showing configuration), listing copy, screenshots, icon, privacy policy URL
7. **Submit** via Partner Dashboard → App Store review (expect 5–10 business days)

## Blockers

- None in code. Blockers are operational: hosting choice + Partner Dashboard
  app creation both need the user/parent agent (browser work).
- `distribution` is intentionally left unset in `shopify.server.ts` until
  pre-submission.

## Coordination note (for the free-shipping-bar agent)

Shared patterns used here that you may want to mirror:
- Billing: single monthly plan via `billing.require()` in the layout loader,
  `isTest: process.env.NODE_ENV !== "production"`
- GDPR: one `webhooks.compliance.tsx` route handling all three topics,
  registered via `compliance_topics` in the TOML
- App proxy + HMAC verification pattern in `tools.*.config.ts`
- This app stores NO customer PII (shop-level settings only) — the GDPR
  handlers are no-ops with audit logging, which is review-acceptable.
