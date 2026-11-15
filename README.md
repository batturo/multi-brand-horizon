# Multi Brand Horizon

Online shop for Multi Brand Horizon, Naya Nangal, Punjab: open-box and surplus
branded apparel, footwear and accessories.

Built with Next.js (App Router, TypeScript), Tailwind CSS and Supabase
(Postgres, Auth, Storage). Deployed on Vercel.

> Status: Phase 2 (storefront) done. WhatsApp ordering, admin, SEO and
> analytics come in later phases. A full setup and deploy guide is written in
> Phase 6.

## Business facts

Every shop detail (address, hours, phones, GSTIN, policies) lives in
[`config/store.ts`](config/store.ts). Anything not yet confirmed is set to
`TODO` and is hidden on the site rather than guessed. List what is still open:

```bash
npm run todos
```

## Local setup

1. Install Node.js 20.9 or newer, then install packages:

   ```bash
   npm install
   ```

2. Create a Supabase project. Copy `.env.example` to `.env.local` and fill in
   the URL and keys from Supabase > Project Settings > API Keys.

3. Apply the database schema. Either link the project with the Supabase CLI:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

   ```bash
   npx supabase db push
   ```

   or paste each file in `supabase/migrations/` (in name order) into the
   Supabase SQL editor.

4. Optional: add the 12 sample products so the pages have something to show.

   ```bash
   npm run samples:add
   ```

   Remove them before launch:

   ```bash
   npm run samples:remove
   ```

5. Run the site:

   ```bash
   npm run dev
   ```

## Preview without a database

To look at the pages before Supabase is set up, run with the sample
products built into the code:

```bash
DEMO_CATALOG=samples npm run dev
```

This only works while Supabase is not configured, and never in production.

## Pages

| Path | Page |
|---|---|
| `/` | Home: sale banner, categories, new arrivals, brands, store location |
| `/c/[slug]` | Category with filters (brand, size in stock, price, condition) and sorting, all in the URL |
| `/p/[slug]` | Product. Sold-out products keep their page and show similar items |
| `/search?q=` | Search (also used for "shop by brand") |
| `/cart` | Cart, kept in the visitor's browser and re-checked against live price and stock |
| `/about`, `/visit`, `/delivery`, `/returns`, `/contact`, `/privacy`, `/terms` | Information pages, filled from `config/store.ts` |

## Checks

```bash
npm run check
```

runs lint, type check, tests and a production build. The database tests run
the real migrations in an in-memory Postgres (PGlite), so they need no Docker
or Supabase account.

## Database at a glance

| Table | What it holds | Who can read | Who can write |
|---|---|---|---|
| `categories` | Name, slug, parent, visible flag, intro text | Public: visible ones only | Admins |
| `products` | Title, brand (plain text), category, gender, condition, MRP, price, description, images, published flag | Public: published products in visible categories | Admins |
| `variants` | Size, colour, stock per product | Public: for visible products | Admins |
| `orders` | Order number, items snapshot, customer details, payment preference, status | Admins | Anyone can place one (always starts as pending) |
| `settings` | Sale banner text, delivery fee | Public | Admins |
| `admin_users` | Which logins are admins | Admins | SQL only |

Rules enforced by the database, not just the website:

- A hidden category, its child categories and every product in them cannot be
  read by the public at all.
- When an order is placed, prices, totals and the delivery fee are rebuilt from
  the database. Whatever the browser sends for prices is ignored.
- Placing an order does not reduce stock. Stock is reduced only when an admin
  sets the order to confirmed, and put back if a confirmed or dispatched order
  is cancelled. If two customers ask for the last unit, the second confirm
  fails and the admin decides.
- Price can never be above MRP. Stock can never go below zero.
