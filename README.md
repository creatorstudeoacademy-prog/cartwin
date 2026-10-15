# Cart Recovery Popup

Exit-intent / timed popup that offers abandoning shoppers a discount code to
complete checkout. Built for the Shopify App Store (recurring subscription).

## Architecture

- **Framework:** Remix + `@shopify/shopify-app-remix` (official template pattern)
- **Admin UI:** Polaris, embedded via App Bridge
- **Storage:** Prisma (SQLite in dev, Postgres in production)
- **Storefront:** Theme app extension — app embed block (`target: body`)
- **Config delivery:** App proxy (`/tools/cart-recovery/config`) with HMAC verification

## How it works

1. Merchant installs the app, picks a plan (Billing API, $9.99/mo, 7-day trial).
2. Merchant configures the popup (Admin > Popup Settings): trigger type,
   delay, discount code + %, heading/subheading/button copy, colors.
3. If the discount code doesn't exist, the app creates it via Admin API
   (`discountCodeBasicCreate`).
4. Merchant activates the **Cart Recovery Popup** app embed in the theme editor
   (Theme settings > App embeds).
5. Storefront JS fetches public config via the app proxy, checks `/cart.js`
   for items, then arms exit-intent (desktop mouse-out) and/or a timer
   (mobile fallback). Popup shows once per session by default.
6. The CTA links to `/discount/CODE`, applying the code at checkout.

## File map

| Path | Purpose |
|---|---|
| `shopify.app.toml` | App config: scopes, webhooks (incl. GDPR), app proxy |
| `app/shopify.server.ts` | Shopify auth + billing plan definition |
| `app/routes/app.tsx` | Embedded layout, enforces active subscription |
| `app/routes/app._index.tsx` | Dashboard / setup guide |
| `app/routes/app.settings.tsx` | Popup settings form + discount code creation |
| `app/routes/app.billing.tsx` | Plan upgrade page |
| `app/routes/tools.cart-recovery.config.ts` | App proxy: public popup config (HMAC-verified) |
| `app/routes/webhooks.*` | app/uninstalled, scopes_update, GDPR compliance |
| `app/models/settings.server.ts` | Prisma-backed settings CRUD |
| `extensions/cart-recovery-popup/` | Theme app extension (embed block + JS asset) |
| `prisma/schema.prisma` | Session + PopupSettings models |

## Local development

```bash
npm install
cp .env.example .env   # fill in Partner Dashboard values
npx prisma db push
shopify app dev
```

## Deployment checklist (before App Store submission)

- [ ] Create the app in Partner Dashboard; fill `client_id`, URLs in `shopify.app.toml` + `.env`
- [ ] Host the Remix app (HTTPS, e.g. Fly.io / Railway / Vercel)
- [ ] Set `distribution = "AppStore"` in `shopify.server.ts` after review prep
- [ ] `shopify app deploy` to push the theme app extension
- [ ] Test install on the dev store; activate the app embed; verify popup + discount flow
- [ ] Record the setup screencast reviewers ask for (configuring the popup)
- [ ] Submit via Partner Dashboard
