# Multi Brand Horizon

Online shop for Multi Brand Horizon, Naya Nangal, Punjab: open-box and surplus
branded apparel, footwear and accessories. Customers browse, add to cart and
send their order on WhatsApp. The shop confirms each order in a phone-friendly
admin.

Built with Next.js 16 (App Router, TypeScript), Tailwind CSS 4 and Supabase
(Postgres, Auth, Storage). Hosted on Netlify (Vercel also works).

**Contents:** [Business facts](#business-facts) ·
[Run it on your computer](#run-it-on-your-computer) ·
[Set up Supabase](#set-up-supabase) ·
[Environment variables](#environment-variables) ·
[Deploy to Netlify](#deploy-to-netlify) ·
[Connect your domain](#connect-your-domain) ·
[Add an admin user](#add-an-admin-user) ·
[Analytics and Search Console](#analytics-and-search-console) ·
[Before launch](#before-launch-checklist) ·
[How it works](#how-it-works)

---

## Business facts

Every shop detail (address, hours, phones, WhatsApp number, GSTIN, policies)
lives in [`config/store.ts`](config/store.ts). Anything not yet confirmed is
set to `TODO` and is **hidden** on the site rather than guessed. See what is
still open:

```bash
npm run todos
```

Things the shop changes day to day (delivery fee, sale banner, category intro
text, products, stock) are edited in the admin, not in code.

---

## Run it on your computer

Needs Node.js 20.9 or newer (22 recommended).

```bash
npm install
```

**Without a database (quick look):** runs the shop and the admin against an
in-memory copy of the real database with 12 sample products. No login is
needed and everything resets when you stop it. It refuses to run on Netlify,
Vercel or CI, because its admin has no login.

```bash
DEMO_CATALOG=samples npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin.

**With your Supabase project:** do [Set up Supabase](#set-up-supabase) first,
then:

```bash
npm run dev
```

**Checks** (lint, type check, tests, production build):

```bash
npm run check
```

The database tests run the real migrations in an in-memory Postgres (PGlite),
so they need no Docker and no Supabase account.

---

## Set up Supabase

1. Create a free project at supabase.com. Choose a region near India (for
   example Mumbai, `ap-south-1`).
2. Copy `.env.example` to `.env.local` and fill in, from
   **Project Settings > API Keys**:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key, `sb_publishable_...`)
   - `SUPABASE_SECRET_KEY` (secret key, `sb_secret_...`). Used only by the
     sample-product scripts on your computer. **Never** put it on Netlify or
     share it.
3. Create the tables, security rules, storage bucket and categories. Either
   with the Supabase CLI:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

   ```bash
   npx supabase db push
   ```

   or paste each file in `supabase/migrations/` into **SQL Editor**, in name
   order, and run it.
4. **Authentication > Sign In / Providers**: keep Email enabled and turn off
   "Allow new users to sign up". Only people you add can log in.
5. [Add an admin user](#add-an-admin-user).
6. Optional: add the 12 sample products so the pages have something to show.

   ```bash
   npm run samples:add
   ```

   Remove them before launch (or run `supabase/remove-sample-products.sql` in
   the SQL editor):

   ```bash
   npm run samples:remove
   ```

---

## Environment variables

| Name | Where | What |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Netlify + `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Netlify + `.env.local` | Supabase publishable key (safe in the browser; row level security protects the data) |
| `SUPABASE_SECRET_KEY` | `.env.local` only | For the sample-product scripts. Never on Netlify |
| `NEXT_PUBLIC_SITE_URL` | Netlify | Your domain with https, no trailing slash, e.g. `https://example.in`. Used for canonical URLs, sitemap, feed and link previews. Without it, Netlify's own address is used |
| `NEXT_PUBLIC_GA_ID` | Netlify | Google Analytics 4 measurement ID (`G-...`). Empty = GA off |
| `NEXT_PUBLIC_META_PIXEL_ID` | Netlify | Meta Pixel ID (digits). Empty = Pixel off |
| `GOOGLE_SITE_VERIFICATION` | Netlify | Search Console HTML-tag code. Empty = no tag |
| `SITE_NOINDEX` | Netlify, preview projects only | `true` hides that copy from search engines. Never set it on the real shop |
| `DEMO_CATALOG` | your computer only | `samples` for the no-database preview |

Values are read when the site is **built**. After changing any variable on
Netlify, start a new deploy (**Deploys > Trigger deploy > Deploy site**).

---

## Deploy to Netlify

Netlify detects Next.js and runs its Next.js runtime (declared in
[`netlify.toml`](netlify.toml)). Nothing extra to install.

**Current projects in the Netlify team:**

| Project | Address | Purpose |
|---|---|---|
| `multi-brand-horizon` | multi-brand-horizon.netlify.app | The live site (still the old version) |
| `multi-brand-horizon-preview` | multi-brand-horizon-preview.netlify.app | New site, for checking. Has `SITE_NOINDEX=true` |

**To make the new site live:**

1. In the **live** project: **Project configuration > Environment variables**,
   add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   and, once you have a domain, `NEXT_PUBLIC_SITE_URL`. Do **not** add
   `SITE_NOINDEX`.
2. Connect the GitHub repository so every push to `main` deploys
   automatically: **Project configuration > Build & deploy > Continuous
   deployment > Link repository**. Branch `main`. Netlify reads the build
   command and folder from `netlify.toml`, so leave those fields as they are.
3. Merge the work into `main` (GitHub pull request). Netlify builds and
   publishes.
4. Check the live site, then do the [before launch checklist](#before-launch-checklist).

To roll back, open **Deploys**, pick an earlier deploy and click **Publish
deploy**.

**Vercel instead of Netlify:** import the repository at vercel.com, add the
same environment variables, deploy. No other changes are needed.

---

## Connect your domain

1. Buy the domain (any registrar).
2. Netlify: **Domain management > Add a domain**, enter it and follow the
   steps. Either:
   - point the domain's nameservers to Netlify DNS (simplest), or
   - keep your registrar's DNS and add **exactly the records Netlify shows
     you** (usually one record for the bare domain and a `CNAME` for `www`).
3. Wait for DNS to update (minutes to a few hours). Netlify then issues the
   HTTPS certificate on its own.
4. Set `NEXT_PUBLIC_SITE_URL` to `https://yourdomain` on Netlify, put the same
   value in `store.siteUrl` in `config/store.ts`, and redeploy. Canonical
   URLs, sitemap, feed and link previews then use your domain.

---

## Add an admin user

1. Supabase: **Authentication > Users > Add user > Create new user**. Enter
   the email and a strong password, tick **Auto Confirm User**.
2. Supabase: **SQL Editor**, run (with that email):

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```

3. Log in at `https://yourdomain/admin/login`.

To remove an admin: `delete from public.admin_users where user_id = (select id
from auth.users where email = '...');`

A login that is not in `admin_users` sees "Not an admin" and cannot read or
change anything: the database itself refuses.

---

## Analytics and Search Console

All optional. Each turns on only when its variable is set; with none set, no
tracking code loads at all. Tracking scripts load after the page is ready so
they do not slow it down. Admin pages are never tracked. The Privacy page
names whichever tools are on.

**Google Analytics 4:** analytics.google.com > Admin > Create property > Web
data stream for your domain. Copy the Measurement ID (`G-...`) into
`NEXT_PUBLIC_GA_ID`. Keep "Enhanced measurement" on (it counts page changes).

**Meta Pixel:** business.facebook.com > Events Manager > Connect data > Web >
Meta Pixel. Copy the Pixel ID into `NEXT_PUBLIC_META_PIXEL_ID`.

**Google Search Console:** search.google.com/search-console > Add property >
URL prefix > your domain > HTML tag. Copy only the `content="..."` value into
`GOOGLE_SITE_VERIFICATION`, redeploy, then click Verify. Then submit
`https://yourdomain/sitemap.xml` under **Sitemaps**.

Events sent (to both GA4 and the Pixel):

| Event | When | GA4 name | Meta Pixel name |
|---|---|---|---|
| View item | A product page opens | `view_item` | `ViewContent` |
| Add to cart | Add to cart is pressed | `add_to_cart` | `AddToCart` |
| Begin checkout | The checkout page opens with items | `begin_checkout` | `InitiateCheckout` |
| WhatsApp order | WhatsApp opens with an order (automatically or by the button) | `whatsapp_order_click` (with order number) | `WhatsAppOrderClick` (custom) |

All values are in INR. The WhatsApp order is not sent as a "purchase" because
no payment has happened yet.

**Product feed** for Google Merchant Center and Meta catalogues:
`https://yourdomain/feed.xml`. Add it as a scheduled feed (daily). One item per
size; items without a photo are left out; only the selling price is sent.

---

## Before launch checklist

- [ ] All TODOs filled in `config/store.ts` (`npm run todos` shows none),
      especially WhatsApp number, address, hours, legal name, GSTIN, returns
      policy, and `legalPagesApproved` after reviewing Privacy and Terms.
- [ ] `public/logo.png` added (the header and structured data pick it up).
- [ ] Sample products removed (`npm run samples:remove`); real products added.
- [ ] Admin > Settings: delivery fee, category intro text (80 to 120 words
      each), sale banner if any.
- [ ] Supabase sign-ups turned off; admin users added.
- [ ] Netlify variables set on the live project, no `SITE_NOINDEX`.
- [ ] Domain connected, `NEXT_PUBLIC_SITE_URL` set, redeployed.
- [ ] Place a test order on your phone, confirm it in the admin, check stock
      went down, then cancel it.
- [ ] Share a product link on WhatsApp and check the preview shows photo and
      price.
- [ ] Search Console verified and sitemap submitted. A product page passes
      Google's Rich Results Test.

---

## How it works

### Pages

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
| `/sitemap.xml`, `/robots.txt`, `/feed.xml` | Generated from the database |
| `/admin` | Admin (login required) |

### Admin

| Screen | What it does |
|---|---|
| Home | Pending orders, products in shop, sold out, and a big Add button |
| Orders | Filter by status. Call or WhatsApp the customer. Confirm (takes stock), dispatched, delivered, cancel (puts stock back if it was taken) |
| Products | Search, quick stock edit per size, Duplicate, Mark sold, Publish/Unpublish, and select many to publish or unpublish together |
| Add / Edit product | Take or pick photos (resized on the phone to 1200px JPEG before upload), title, brand, category, for, condition, MRP, price, sizes with quantities, publish |
| Settings | Sale banner, delivery fee, category visibility and intro text |

Changes show in the shop straight away.

### A WhatsApp order

1. The customer fills in the checkout form. Phone and PIN code are checked in
   the browser and again on the server.
2. The database prices the order from its own data, saves it as **pending**
   and returns an order number like `MBH-10001`. Stock is not reduced.
3. The customer sees the order number, and WhatsApp opens to the shop's number
   with the order number, items, sizes, total and address filled in.
4. The admin confirms the order. Only then is stock reduced. If two customers
   asked for the last piece, the second confirm is refused and the admin
   decides.

### Database

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
  confirms, and put back if a confirmed or dispatched order is cancelled.
- Price can never be above MRP. Stock can never go below zero.
- Every admin action is a single database function that checks the caller is
  an admin.

### SEO

- Every page has its own title and description from real data and a canonical
  URL. Filtered category URLs point their canonical at the plain category
  page. Search, cart, checkout and admin are not indexed.
- Structured data (JSON-LD): the shop as a ClothingStore on Home and Visit;
  Product (price, availability, condition, MRP as list price) and
  BreadcrumbList on product pages; BreadcrumbList on category pages. Only
  confirmed facts are used.
- Link previews (WhatsApp, Facebook): product pages share the product photo,
  price and percent off; other pages share a black and gold card.

### Speed

Lighthouse, mobile (slow 4G and a mid-range phone simulated), measured on the
sample catalogue without analytics, lower of two runs:

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home | 99 | 100 | 100 | 100 |
| Category (`/c/apparel`) | 93 | 100 | 100 | 100 |
| Product | 98 | 100 | 100 | 100 |

Re-measure on the live site with real photos and analytics on: PageSpeed
Insights (pagespeed.web.dev).
