-- Multi Brand Horizon: core schema.
--
-- Money is stored as whole rupees (integer). Prices include taxes.
-- Row level security is enabled on every table:
--   * anyone can read visible categories, published products in visible
--     categories, their variants, and the public settings row
--   * anyone can place an order (insert), which always starts as 'pending'
--   * everything else needs an admin (a row in public.admin_users)

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.product_condition as enum (
  'new_with_tags',
  'open_box_like_new',
  'open_box_minor_marks'
);

create type public.product_gender as enum ('men', 'women', 'unisex', 'kids');

create type public.order_status as enum (
  'pending',
  'confirmed',
  'dispatched',
  'delivered',
  'cancelled'
);

create type public.payment_preference as enum ('cod', 'upi');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Admin users. Add a row here (by user id from auth.users) to make someone an
-- admin. There is deliberately no API write access to this table.
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references public.categories (id) on delete restrict,
  is_visible boolean not null default false,
  intro text check (intro is null or length(intro) <= 2000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);

create index categories_parent_id_idx on public.categories (parent_id);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- A category is public only if it and every ancestor are visible.
-- 'union' (not 'union all') stops the walk if a parent loop is ever created.
create function public.category_is_public(cat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive chain as (
    select c.id, c.parent_id, c.is_visible
    from public.categories c
    where c.id = cat_id
    union
    select p.id, p.parent_id, p.is_visible
    from public.categories p
    join chain on p.id = chain.parent_id
  )
  select coalesce(bool_and(is_visible), false) from chain;
$$;

-- ---------------------------------------------------------------------------
-- Products and variants
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Brand is plain text only. No logos, no brand tables.
  brand text not null check (length(btrim(brand)) between 1 and 80),
  category_id uuid not null references public.categories (id) on delete restrict,
  gender public.product_gender not null default 'unisex',
  condition public.product_condition not null,
  mrp integer not null check (mrp > 0),
  price integer not null check (price > 0 and price <= mrp),
  description text not null default '' check (length(description) <= 5000),
  -- Array of { "src": string, "alt": string, "width"?: int, "height"?: int }.
  -- src is a path inside the product-images storage bucket, or a site path
  -- starting with "/".
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  is_published boolean not null default false,
  -- Marks the fake sample products so they can be removed in one go.
  is_sample boolean not null default false,
  published_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(brand, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_published_created_idx on public.products (is_published, created_at desc);
create index products_brand_idx on public.products (lower(brand));
create index products_search_idx on public.products using gin (search);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create function public.products_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger products_published_at
before insert or update of is_published on public.products
for each row execute function public.products_set_published_at();

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null default '' check (length(size) <= 30),
  colour text not null default '' check (length(colour) <= 40),
  stock integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, colour)
);

create index variants_product_id_idx on public.variants (product_id);

create trigger variants_set_updated_at
before update on public.variants
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------------

create table public.settings (
  id boolean primary key default true check (id),
  sale_banner_text text check (sale_banner_text is null or length(sale_banner_text) <= 200),
  -- Flat delivery fee in rupees. NULL means "not set yet": orders then carry
  -- no fee and the shop confirms it on WhatsApp.
  delivery_fee integer check (delivery_fee is null or delivery_fee >= 0),
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  -- Snapshot of what was ordered, built by the database from current prices:
  -- [{ product_id, variant_id, title, brand, slug, condition, size, colour,
  --    mrp, unit_price, quantity, line_total }]
  items jsonb not null check (
    jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50
  ),
  subtotal integer not null check (subtotal >= 0),
  -- NULL when the shop has not set a delivery fee yet.
  delivery_fee integer check (delivery_fee is null or delivery_fee >= 0),
  total integer not null check (total >= 0),
  customer_name text not null check (length(btrim(customer_name)) between 2 and 100),
  -- 10 digit Indian mobile number, no country code.
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  address text not null check (length(btrim(address)) between 10 and 500),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  payment_preference public.payment_preference not null,
  status public.order_status not null default 'pending',
  -- True while stock for this order has been taken off the shelf count.
  stock_applied boolean not null default false,
  admin_note text check (admin_note is null or length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  check (total = subtotal + coalesce(delivery_fee, 0))
);

create index orders_status_created_idx on public.orders (status, created_at desc);

-- Every insert, whatever path it comes from, is rebuilt here from the
-- database's own prices and stock. The caller only chooses variants and
-- quantities: items = [{ "variant_id": uuid, "quantity": int }].
create function public.orders_prepare_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  req jsonb;
  merged jsonb := '{}'::jsonb;
  vid text;
  qty integer;
  line record;
  snapshot jsonb := '[]'::jsonb;
  sub integer := 0;
  fee integer;
  digits text;
begin
  if new.items is null or jsonb_typeof(new.items) <> 'array'
     or jsonb_array_length(new.items) = 0 then
    raise exception 'Order has no items' using errcode = '22023';
  end if;

  -- Merge duplicate variants and validate quantities.
  for req in select * from jsonb_array_elements(new.items) loop
    vid := req ->> 'variant_id';
    if vid is null or vid !~ '^[0-9a-fA-F-]{36}$' then
      raise exception 'Invalid item' using errcode = '22023';
    end if;
    begin
      qty := (req ->> 'quantity')::integer;
    exception when others then
      raise exception 'Invalid quantity' using errcode = '22023';
    end;
    if qty is null or qty < 1 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;
    merged := jsonb_set(
      merged, array[lower(vid)],
      to_jsonb(coalesce((merged ->> lower(vid))::integer, 0) + qty)
    );
  end loop;

  for vid, qty in select key, value::integer from jsonb_each_text(merged) loop
    if qty > 10 then
      raise exception 'At most 10 of one item per order' using errcode = '22023';
    end if;

    select p.id as product_id, v.id as variant_id, p.title, p.brand, p.slug,
           p.condition, v.size, v.colour, p.mrp, p.price, v.stock
      into line
      from public.variants v
      join public.products p on p.id = v.product_id
     where v.id = vid::uuid
       and p.is_published
       and public.category_is_public(p.category_id);

    if not found then
      raise exception 'Item is no longer available' using errcode = 'P0002';
    end if;
    -- Stock is checked but not reserved: two customers may request the same
    -- last unit and the admin decides who gets it when confirming.
    if line.stock < qty then
      raise exception 'Only % left of % %', line.stock, line.title, line.size
        using errcode = 'P0001';
    end if;

    snapshot := snapshot || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'title', line.title,
      'brand', line.brand,
      'slug', line.slug,
      'condition', line.condition,
      'size', line.size,
      'colour', line.colour,
      'mrp', line.mrp,
      'unit_price', line.price,
      'quantity', qty,
      'line_total', line.price * qty
    );
    sub := sub + line.price * qty;
  end loop;

  select s.delivery_fee into fee from public.settings s where s.id;

  -- Normalise phone: keep digits, drop a leading 91 or 0.
  digits := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  if length(digits) = 12 and left(digits, 2) = '91' then
    digits := right(digits, 10);
  elsif length(digits) = 11 and left(digits, 1) = '0' then
    digits := right(digits, 10);
  end if;

  new.id := gen_random_uuid();
  new.order_number := 'MBH-' || (10000 + nextval('public.order_number_seq'))::text;
  new.items := snapshot;
  new.subtotal := sub;
  new.delivery_fee := fee;
  new.total := sub + coalesce(fee, 0);
  new.phone := digits;
  new.customer_name := btrim(new.customer_name);
  new.address := btrim(new.address);
  new.pincode := btrim(new.pincode);
  new.status := 'pending';
  new.stock_applied := false;
  new.created_at := now();
  new.updated_at := now();
  new.confirmed_at := null;
  new.dispatched_at := null;
  new.delivered_at := null;
  new.cancelled_at := null;
  if not public.is_admin() then
    new.admin_note := null;
  end if;
  return new;
end;
$$;

create trigger orders_prepare_insert
before insert on public.orders
for each row execute function public.orders_prepare_insert();

-- Status changes. Stock is only taken off when an admin confirms an order and
-- is put back if a confirmed or dispatched order is cancelled.
--   pending    -> confirmed | cancelled
--   confirmed  -> dispatched | cancelled
--   dispatched -> delivered | cancelled
--   delivered, cancelled: final
create function public.orders_apply_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  updated integer;
begin
  -- Fields fixed at creation, and the stock flag, are never edited directly.
  new.id := old.id;
  new.order_number := old.order_number;
  new.items := old.items;
  new.subtotal := old.subtotal;
  new.delivery_fee := old.delivery_fee;
  new.total := old.total;
  new.created_at := old.created_at;
  new.stock_applied := old.stock_applied;
  new.confirmed_at := old.confirmed_at;
  new.dispatched_at := old.dispatched_at;
  new.delivered_at := old.delivered_at;
  new.cancelled_at := old.cancelled_at;

  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('confirmed', 'cancelled')) or
    (old.status = 'confirmed' and new.status in ('dispatched', 'cancelled')) or
    (old.status = 'dispatched' and new.status in ('delivered', 'cancelled'))
  ) then
    raise exception 'Cannot change order from % to %', old.status, new.status
      using errcode = '22023';
  end if;

  if new.status = 'confirmed' and not old.stock_applied then
    for item in select * from jsonb_array_elements(old.items) loop
      update public.variants
         set stock = stock - (item ->> 'quantity')::integer
       where id = (item ->> 'variant_id')::uuid
         and stock >= (item ->> 'quantity')::integer;
      get diagnostics updated = row_count;
      if updated = 0 then
        raise exception 'Not enough stock to confirm: % (size %)',
          item ->> 'title', nullif(item ->> 'size', '')
          using errcode = 'P0001';
      end if;
    end loop;
    new.stock_applied := true;
  end if;

  if new.status = 'cancelled' and old.stock_applied then
    for item in select * from jsonb_array_elements(old.items) loop
      -- If the variant was deleted since, there is nothing to put back.
      update public.variants
         set stock = stock + (item ->> 'quantity')::integer
       where id = (item ->> 'variant_id')::uuid;
    end loop;
    new.stock_applied := false;
  end if;

  case new.status
    when 'confirmed' then new.confirmed_at := now();
    when 'dispatched' then new.dispatched_at := now();
    when 'delivered' then new.delivered_at := now();
    when 'cancelled' then new.cancelled_at := now();
    else null;
  end case;

  return new;
end;
$$;

create trigger orders_apply_status_change
before update on public.orders
for each row execute function public.orders_apply_status_change();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Place an order and get back what the customer needs to see (order number,
-- items, totals). Runs as the table owner so the caller does not need read
-- access to the orders table.
create function public.place_order(
  p_items jsonb,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_pincode text,
  p_payment_preference public.payment_preference
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  insert into public.orders (
    order_number, items, subtotal, total, customer_name, phone, address,
    pincode, payment_preference
  ) values (
    '', p_items, 0, 0, p_customer_name, p_phone, p_address, p_pincode,
    p_payment_preference
  )
  returning * into o;

  return jsonb_build_object(
    'order_number', o.order_number,
    'items', o.items,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'customer_name', o.customer_name,
    'phone', o.phone,
    'address', o.address,
    'pincode', o.pincode,
    'payment_preference', o.payment_preference,
    'created_at', o.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;

-- admin_users: admins can see the list. Changes only through SQL.
create policy "admins read admin list" on public.admin_users
  for select to authenticated using ((select public.is_admin()));

-- categories
create policy "public reads visible categories" on public.categories
  for select to anon, authenticated
  using (public.category_is_public(id) or (select public.is_admin()));
create policy "admins insert categories" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update categories" on public.categories
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete categories" on public.categories
  for delete to authenticated using ((select public.is_admin()));

-- products
create policy "public reads published products" on public.products
  for select to anon, authenticated
  using (
    (is_published and public.category_is_public(category_id))
    or (select public.is_admin())
  );
create policy "admins insert products" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update products" on public.products
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete products" on public.products
  for delete to authenticated using ((select public.is_admin()));

-- variants: visible when their product is visible (products RLS applies in
-- the subquery too).
create policy "public reads variants of published products" on public.variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "admins insert variants" on public.variants
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update variants" on public.variants
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete variants" on public.variants
  for delete to authenticated using ((select public.is_admin()));

-- settings: public needs the banner text and delivery fee.
create policy "public reads settings" on public.settings
  for select to anon, authenticated using (true);
create policy "admins update settings" on public.settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- orders: anyone may place one (the insert trigger forces it to 'pending' and
-- rebuilds prices). Only admins can read or change orders. No deletes:
-- cancel instead.
create policy "public places orders" on public.orders
  for insert to anon, authenticated with check (status = 'pending');
create policy "admins read orders" on public.orders
  for select to authenticated using ((select public.is_admin()));
create policy "admins update orders" on public.orders
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Grants (explicit, so access does not depend on project defaults)
-- ---------------------------------------------------------------------------

revoke all on public.admin_users, public.categories, public.products,
  public.variants, public.settings, public.orders from anon, authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.variants,
  public.settings to anon, authenticated;
grant insert, update, delete on public.categories, public.products,
  public.variants to authenticated;
grant update on public.settings to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant select on public.admin_users to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.category_is_public(uuid) to anon, authenticated;
grant execute on function public.place_order(
  jsonb, text, text, text, text, public.payment_preference
) to anon, authenticated;
