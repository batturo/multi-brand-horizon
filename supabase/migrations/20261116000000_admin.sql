-- Admin operations. Each one is a single database function so it runs in one
-- transaction. They run as the caller (security invoker), so row level
-- security still applies, and each also refuses non-admins outright.

create function public.assert_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
end;
$$;

-- "Nike Air Max 90 (UK 9)" -> "nike-air-max-90-uk-9"
create function public.slugify(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      left(trim(both '-' from regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '-', 'g')), 80),
      ''
    ),
    'item'
  );
$$;

-- A product slug not used by any other product: base, base-2, base-3...
create function public.unique_product_slug(base text, except_id uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  candidate text := public.slugify(base);
  n integer := 1;
begin
  while exists (
    select 1 from public.products
    where slug = candidate and id is distinct from except_id
  ) loop
    n := n + 1;
    candidate := left(public.slugify(base), 75) || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- One product with its category name and variants, as JSON.
create function public.admin_product_json(p public.products)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select to_jsonb(p) - 'search' || jsonb_build_object(
    'category_name', (select c.name from public.categories c where c.id = p.category_id),
    'category_visible', public.category_is_public(p.category_id),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'size', v.size, 'colour', v.colour, 'stock', v.stock, 'sort_order', v.sort_order
      ) order by v.sort_order, v.size)
      from public.variants v where v.product_id = p.id
    ), '[]'::jsonb),
    'total_stock', coalesce((select sum(v.stock) from public.variants v where v.product_id = p.id), 0)
  );
$$;

-- List products for the admin. filter: all | published | draft | sold_out | in_stock
create function public.admin_list_products(
  p_search text default null,
  p_filter text default 'all',
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
  q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(public.admin_product_json(p) order by p.created_at desc), '[]'::jsonb)
    into result
    from (
      select p.* from public.products p
      where (q is null
             or p.title ilike '%' || q || '%'
             or p.brand ilike '%' || q || '%'
             or p.slug ilike '%' || q || '%')
        and case coalesce(p_filter, 'all')
              when 'published' then p.is_published
              when 'draft' then not p.is_published
              when 'sold_out' then not exists (
                select 1 from public.variants v where v.product_id = p.id and v.stock > 0)
              when 'in_stock' then exists (
                select 1 from public.variants v where v.product_id = p.id and v.stock > 0)
              else true
            end
      order by p.created_at desc
      limit least(greatest(coalesce(p_limit, 200), 1), 1000)
    ) p;
  return result;
end;
$$;

create function public.admin_get_product(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  p public.products;
begin
  perform public.assert_admin();
  select * into p from public.products where id = p_id;
  if not found then
    return null;
  end if;
  return public.admin_product_json(p);
end;
$$;

-- Create or update a product and its sizes in one go.
-- p = { id?, title, brand, category_id, gender, condition, mrp, price,
--       description, images: [...], is_published,
--       variants: [{ id?, size, colour, stock }] }
-- Variants not in the list are deleted. The slug is set from the title on
-- create and never changes after, so links keep working.
create function public.admin_save_product(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  pid uuid := nullif(p ->> 'id', '')::uuid;
  v jsonb;
  vid uuid;
  keep uuid[] := '{}';
  i integer := 0;
  saved public.products;
begin
  perform public.assert_admin();

  if jsonb_typeof(p -> 'variants') <> 'array' or jsonb_array_length(p -> 'variants') = 0 then
    raise exception 'Add at least one size' using errcode = '22023';
  end if;

  if pid is null then
    insert into public.products (
      title, slug, brand, category_id, gender, condition, mrp, price,
      description, images, is_published
    ) values (
      btrim(p ->> 'title'),
      public.unique_product_slug(p ->> 'title'),
      btrim(p ->> 'brand'),
      (p ->> 'category_id')::uuid,
      (p ->> 'gender')::public.product_gender,
      (p ->> 'condition')::public.product_condition,
      (p ->> 'mrp')::integer,
      (p ->> 'price')::integer,
      coalesce(p ->> 'description', ''),
      coalesce(p -> 'images', '[]'::jsonb),
      coalesce((p ->> 'is_published')::boolean, false)
    )
    returning * into saved;
  else
    update public.products set
      title = btrim(p ->> 'title'),
      brand = btrim(p ->> 'brand'),
      category_id = (p ->> 'category_id')::uuid,
      gender = (p ->> 'gender')::public.product_gender,
      condition = (p ->> 'condition')::public.product_condition,
      mrp = (p ->> 'mrp')::integer,
      price = (p ->> 'price')::integer,
      description = coalesce(p ->> 'description', ''),
      images = coalesce(p -> 'images', '[]'::jsonb),
      is_published = coalesce((p ->> 'is_published')::boolean, false)
    where id = pid
    returning * into saved;
    if not found then
      raise exception 'Product not found' using errcode = 'P0002';
    end if;
  end if;

  for v in select * from jsonb_array_elements(p -> 'variants') loop
    vid := nullif(v ->> 'id', '')::uuid;
    if vid is not null and exists (
      select 1 from public.variants where id = vid and product_id = saved.id
    ) then
      update public.variants set
        size = btrim(coalesce(v ->> 'size', '')),
        colour = btrim(coalesce(v ->> 'colour', '')),
        stock = (v ->> 'stock')::integer,
        sort_order = i
      where id = vid;
    else
      insert into public.variants (product_id, size, colour, stock, sort_order)
      values (
        saved.id,
        btrim(coalesce(v ->> 'size', '')),
        btrim(coalesce(v ->> 'colour', '')),
        (v ->> 'stock')::integer,
        i
      )
      returning id into vid;
    end if;
    keep := keep || vid;
    i := i + 1;
  end loop;

  delete from public.variants where product_id = saved.id and not (id = any (keep));

  return public.admin_product_json(saved);
end;
$$;

-- Copy a product as an unpublished draft with zero stock, so a similar item
-- can be added quickly. Photos are copied too and should be replaced.
create function public.admin_duplicate_product(p_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  src public.products;
  copy public.products;
begin
  perform public.assert_admin();
  select * into src from public.products where id = p_id;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  insert into public.products (
    title, slug, brand, category_id, gender, condition, mrp, price,
    description, images, is_published, is_sample
  ) values (
    left(src.title || ' (copy)', 160),
    public.unique_product_slug(src.title || ' copy'),
    src.brand, src.category_id, src.gender, src.condition, src.mrp, src.price,
    src.description, src.images, false, src.is_sample
  )
  returning * into copy;
  insert into public.variants (product_id, size, colour, stock, sort_order)
  select copy.id, size, colour, 0, sort_order from public.variants where product_id = p_id;
  return public.admin_product_json(copy);
end;
$$;

create function public.admin_set_stock(p_variant_id uuid, p_stock integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  s integer;
begin
  perform public.assert_admin();
  if p_stock is null or p_stock < 0 or p_stock > 100000 then
    raise exception 'Stock must be 0 or more' using errcode = '22023';
  end if;
  update public.variants set stock = p_stock where id = p_variant_id returning stock into s;
  if not found then
    raise exception 'Size not found' using errcode = 'P0002';
  end if;
  return s;
end;
$$;

-- Sold in the shop: every size to zero. The page stays up as "Sold out".
create function public.admin_mark_sold(p_product_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.variants set stock = 0 where product_id = p_product_id;
end;
$$;

create function public.admin_set_published(p_ids uuid[], p_published boolean)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  n integer;
begin
  perform public.assert_admin();
  update public.products set is_published = p_published where id = any (p_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Orders, newest first. p_status null means all.
create function public.admin_list_orders(
  p_status public.order_status default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc), '[]'::jsonb)
    into result
    from (
      select * from public.orders
      where p_status is null or status = p_status
      order by created_at desc
      limit least(greatest(coalesce(p_limit, 100), 1), 500)
    ) o;
  return result;
end;
$$;

-- Change status. Stock is taken or returned by the orders trigger.
create function public.admin_set_order_status(p_id uuid, p_status public.order_status)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  o public.orders;
begin
  perform public.assert_admin();
  update public.orders set status = p_status where id = p_id returning * into o;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  return to_jsonb(o);
end;
$$;

create function public.admin_save_settings(p_sale_banner_text text, p_delivery_fee integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  s public.settings;
begin
  perform public.assert_admin();
  update public.settings set
    sale_banner_text = nullif(btrim(coalesce(p_sale_banner_text, '')), ''),
    delivery_fee = p_delivery_fee
  where id
  returning * into s;
  return to_jsonb(s);
end;
$$;

create function public.admin_list_categories()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
      'product_count', (select count(*) from public.products p where p.category_id = c.id)
    ) order by c.sort_order, c.name), '[]'::jsonb)
    into result
    from public.categories c;
  return result;
end;
$$;

create function public.admin_save_category(p_id uuid, p_is_visible boolean, p_intro text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c public.categories;
begin
  perform public.assert_admin();
  update public.categories set
    is_visible = p_is_visible,
    intro = nullif(btrim(coalesce(p_intro, '')), '')
  where id = p_id
  returning * into c;
  if not found then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;
  return to_jsonb(c);
end;
$$;

create function public.admin_summary()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'pending_orders', (select count(*) from public.orders where status = 'pending'),
    'confirmed_orders', (select count(*) from public.orders where status = 'confirmed'),
    'products', (select count(*) from public.products),
    'published', (select count(*) from public.products where is_published),
    'sold_out', (select count(*) from public.products p where p.is_published and not exists (
      select 1 from public.variants v where v.product_id = p.id and v.stock > 0)),
    'samples', (select count(*) from public.products where is_sample)
  );
end;
$$;

-- Brand names already used, for the brand suggestions when adding a product.
create function public.admin_list_brands()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(b order by lower(b)), '[]'::jsonb) into result
    from (select distinct on (lower(brand)) brand as b from public.products order by lower(brand), brand) x;
  return result;
end;
$$;

-- Only signed-in users can call these; each checks for admin itself.
revoke execute on function
  public.assert_admin(),
  public.slugify(text),
  public.unique_product_slug(text, uuid),
  public.admin_product_json(public.products),
  public.admin_list_products(text, text, integer),
  public.admin_get_product(uuid),
  public.admin_save_product(jsonb),
  public.admin_duplicate_product(uuid),
  public.admin_set_stock(uuid, integer),
  public.admin_mark_sold(uuid),
  public.admin_set_published(uuid[], boolean),
  public.admin_list_orders(public.order_status, integer),
  public.admin_set_order_status(uuid, public.order_status),
  public.admin_save_settings(text, integer),
  public.admin_list_categories(),
  public.admin_save_category(uuid, boolean, text),
  public.admin_summary(),
  public.admin_list_brands()
from public, anon;

grant execute on function
  public.assert_admin(),
  public.slugify(text),
  public.unique_product_slug(text, uuid),
  public.admin_product_json(public.products),
  public.admin_list_products(text, text, integer),
  public.admin_get_product(uuid),
  public.admin_save_product(jsonb),
  public.admin_duplicate_product(uuid),
  public.admin_set_stock(uuid, integer),
  public.admin_mark_sold(uuid),
  public.admin_set_published(uuid[], boolean),
  public.admin_list_orders(public.order_status, integer),
  public.admin_set_order_status(uuid, public.order_status),
  public.admin_save_settings(text, integer),
  public.admin_list_categories(),
  public.admin_save_category(uuid, boolean, text),
  public.admin_summary(),
  public.admin_list_brands()
to authenticated;
