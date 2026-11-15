# Multi Brand Horizon

Online shop for Multi Brand Horizon, Naya Nangal, Punjab: open-box and surplus
branded apparel, footwear and accessories.

Built with Next.js (App Router, TypeScript), Tailwind CSS and Supabase
(Postgres, Auth, Storage). Deployed on Vercel.

> Status: Phase 4 (admin) done. SEO and
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

To look at the shop and the admin before Supabase is set up, run against an
in-memory copy of the database with the sample products:

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
| `/checkout` | Name, mobile, address, PIN code, COD or UPI. Saves the order as pending |
| `/checkout/sent` | Order number, then opens WhatsApp with the order message (or asks the customer to wait for a call if no WhatsApp number is set) |
| `/about`, `/visit`, `/delivery`, `/returns`, `/contact`, `/privacy`, `/terms` | Information pages, filled from `config/store.ts` |

## Admin

Open `/admin` on your phone. Screens:

| Screen | What it does |
|---|---|
| Home | Pending orders, products in shop, sold out, and a big Add button |
| Orders | Filter by status. Call or WhatsApp the customer. Confirm (takes stock), dispatched, delivered, cancel (puts stock back if it was taken) |
| Products | Search, quick stock edit per size, Duplicate, Mark sold, Publish/Unpublish, and select many to publish or unpublish together |
| Add / Edit product | Take or pick photos (shrunk on the phone before upload), title, brand, category, for, condition, MRP, price, sizes with quantities, publish |
| Settings | Sale banner, delivery fee, category visibility and intro text |

### Add an admin user

1. Supabase > Authentication > Users > **Add user**. Enter email and password
   and tick "Auto confirm".
2. Supabase > SQL editor, run (with that email):

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```

3. Recommended: Supabase > Authentication > Sign In / Providers, turn off
   "Allow new users to sign up". Only people you add can log in.

A login that is not in `admin_users` can sign in but sees "Not an admin" and
cannot read or change anything (the database refuses).

### Trying the admin without Supabase

`DEMO_CATALOG=samples npm run dev` runs the whole shop and admin against an
in-memory copy of the real database schema with the sample products. No
login is needed. Everything resets when the server stops.

## How a WhatsApp order works

1. The customer fills in the checkout form. Phone and PIN code are checked
   in the browser and again on the server.
2. The database prices the order from its own data, saves it as **pending**
   and returns an order number like `MBH-10001`. Stock is not reduced.
3. The customer sees the order number, and WhatsApp opens to the shop's
   number with the order number, items, sizes, total and address filled in.
4. The admin confirms the order (Phase 4). Only then is stock reduced. If two
   customers asked for the last piece, the second confirm is refused.

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
