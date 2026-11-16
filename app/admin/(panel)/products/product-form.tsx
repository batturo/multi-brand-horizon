"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { saveProductAction, uploadImageAction } from "@/app/admin/actions";
import { compressImage } from "@/lib/admin/compress-image";
import {
  GENDERS,
  MAX_IMAGES,
  SIZE_PRESETS,
  parseRupees,
  validateProduct,
  type ProductErrors,
} from "@/lib/admin/product-input";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";
import { CONDITIONS, CONDITION_LABELS } from "@/lib/catalog/conditions";
import { productImageUrl, skipOptimization } from "@/lib/catalog/images";
import { discountPercent } from "@/lib/pricing";
import type { ProductImage } from "@/lib/types";

type Photo = ProductImage & { key: string; preview?: string; uploading?: boolean; error?: string };
type Row = { key: string; id?: string; size: string; colour: string; stock: string };

const LAST_KEY = "mbh-admin-last";
let counter = 0;
const k = () => `k${++counter}`;

function emptyState(initial: AdminProduct | null) {
  return {
    title: initial?.title ?? "",
    brand: initial?.brand ?? "",
    category_id: initial?.category_id ?? "",
    gender: initial?.gender ?? "",
    condition: initial?.condition ?? "",
    mrp: initial ? String(initial.mrp) : "",
    price: initial ? String(initial.price) : "",
    description: initial?.description ?? "",
    is_published: initial?.is_published ?? true,
  };
}

export function ProductForm({
  initial,
  categories,
  brands,
  copied = false,
}: {
  initial: AdminProduct | null;
  categories: AdminCategory[];
  brands: string[];
  copied?: boolean;
}) {
  const router = useRouter();
  const brandListId = useId();
  // Until React has loaded, inputs would not reach state; keep them disabled.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [f, setF] = useState(() => emptyState(initial));
  const [photos, setPhotos] = useState<Photo[]>(() => (initial?.images ?? []).map((i) => ({ ...i, key: k() })));
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.variants.length
      ? initial.variants.map((v) => ({ key: k(), id: v.id, size: v.size, colour: v.colour, stock: String(v.stock) }))
      : [],
  );
  const [errors, setErrors] = useState<ProductErrors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string; link?: string } | null>(
    copied ? { ok: true, text: "Copy saved as a draft with 0 stock. Change the photos, sizes and stock, then publish." } : null,
  );
  const [saving, start] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((s) => ({ ...s, [key]: value }));
  const uploading = photos.some((p) => p.uploading);
  const mrpN = parseRupees(f.mrp);
  const priceN = parseRupees(f.price);
  const off = !Number.isNaN(mrpN) && !Number.isNaN(priceN) ? discountPercent(mrpN, priceN) : 0;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_IMAGES - photos.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (list.length < files.length) setMessage({ ok: false, text: `At most ${MAX_IMAGES} photos per product.` });
    const added: Photo[] = list.map((file) => ({ key: k(), src: "", alt: "", preview: URL.createObjectURL(file), uploading: true }));
    setPhotos((p) => [...p, ...added]);
    // One at a time: kinder to a 4G connection.
    for (let i = 0; i < list.length; i++) {
      const key = added[i].key;
      try {
        const c = await compressImage(list[i]);
        const form = new FormData();
        form.append("file", new File([c.blob], "photo.jpg", { type: c.type }));
        const r = await uploadImageAction(form);
        if (!r.ok) throw new Error(r.error);
        setPhotos((p) =>
          p.map((ph) => (ph.key === key ? { ...ph, src: r.data.src, width: c.width, height: c.height, uploading: false } : ph)),
        );
      } catch (e) {
        setPhotos((p) =>
          p.map((ph) =>
            ph.key === key ? { ...ph, uploading: false, error: e instanceof Error ? e.message : "Upload failed." } : ph,
          ),
        );
      }
    }
  }

  function movePhotoFirst(key: string) {
    setPhotos((p) => {
      const ph = p.find((x) => x.key === key);
      return ph ? [ph, ...p.filter((x) => x.key !== key)] : p;
    });
  }

  function addSizes(sizes: string[]) {
    setRows((r) => {
      const have = new Set(r.map((x) => x.size.toLowerCase()));
      return [...r, ...sizes.filter((s) => !have.has(s.toLowerCase())).map((size) => ({ key: k(), size, colour: "", stock: "1" }))];
    });
  }

  const setRow = (key: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const bump = (key: string, d: number) =>
    setRows((r) =>
      r.map((x) => (x.key === key ? { ...x, stock: String(Math.max(0, (parseInt(x.stock, 10) || 0) + d)) } : x)),
    );

  function fillFromLast() {
    try {
      const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as Partial<typeof f> | null;
      if (last) setF((s) => ({ ...s, category_id: last.category_id ?? s.category_id, gender: last.gender ?? s.gender, condition: last.condition ?? s.condition }));
    } catch {
      // ignore
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) {
      setMessage({ ok: false, text: "Wait for the photos to finish uploading." });
      return;
    }
    const input = {
      ...(initial ? { id: initial.id } : {}),
      ...f,
      images: photos.filter((p) => p.src && !p.error).map(({ src, alt, width, height }) => ({ src, alt, width, height })),
      variants: rows.map(({ id, size, colour, stock }) => ({ id, size, colour, stock })),
    };
    const checked = validateProduct(input);
    if (!checked.ok) {
      setErrors(checked.errors);
      setMessage({ ok: false, text: "Please fix the highlighted fields." });
      document.getElementById(`pf-${Object.keys(checked.errors)[0]}`)?.scrollIntoView({ block: "center" });
      return;
    }
    setErrors({});
    start(async () => {
      const r = await saveProductAction(input);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setMessage({ ok: false, text: r.error });
        return;
      }
      try {
        localStorage.setItem(LAST_KEY, JSON.stringify({ category_id: f.category_id, gender: f.gender, condition: f.condition }));
      } catch {
        // ignore
      }
      if (initial) {
        setMessage({ ok: true, text: "Saved.", link: f.is_published ? `/p/${r.data.slug}` : undefined });
        router.refresh();
      } else {
        // Ready for the next item; keep category, gender and condition.
        setF((s) => ({ ...emptyState(null), category_id: s.category_id, gender: s.gender, condition: s.condition }));
        setPhotos([]);
        setRows([]);
        setMessage({ ok: true, text: `Saved "${checked.payload.title}". Add the next one.`, link: `/admin/products/${r.data.id}` });
        window.scrollTo({ top: 0 });
      }
    });
  }

  const err = (key: keyof ProductErrors) =>
    errors[key] ? (
      <p id={`pe-${key}`} className="mt-1 text-sm font-medium text-red-700">
        {errors[key]}
      </p>
    ) : null;
  const box = "mt-1 block w-full rounded border border-ink/40 bg-white px-3 py-2.5 text-base";
  const chip = (on: boolean) =>
    `flex min-h-11 items-center justify-center rounded border px-3 text-sm ${on ? "border-ink bg-ink text-white" : "border-ink/40 bg-white"}`;

  return (
    <form onSubmit={submit} noValidate className="pb-24">
      <fieldset disabled={!ready} className="space-y-6">
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded border-2 bg-white p-3 text-sm font-medium ${message.ok ? "border-green-800" : "border-red-700 text-red-800"}`}
        >
          {message.text}{" "}
          {message.link && (
            <Link href={message.link} className="underline underline-offset-4" target={message.link.startsWith("/p/") ? "_blank" : undefined}>
              {message.link.startsWith("/p/") ? "View in shop" : "Open it"}
            </Link>
          )}
        </p>
      )}

      {/* Photos */}
      <section id="pf-images" aria-labelledby="pf-photos-h" className="rounded border border-line bg-white p-4">
        <h2 id="pf-photos-h" className="font-semibold">
          Photos
        </h2>
        <p className="text-sm text-muted">First photo is the main one. Plain background, good light.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="min-h-12 flex-1 rounded bg-ink font-semibold text-white">
            Take photo
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()} className="min-h-12 flex-1 rounded border-2 border-ink font-semibold">
            Choose photos
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {photos.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((ph, i) => {
              const src = ph.preview ?? productImageUrl(ph.src);
              return (
                <li key={ph.key} className="rounded border border-line p-1">
                  <div className="relative aspect-[4/5] bg-white">
                    <Image src={src} alt={`Photo ${i + 1}`} fill sizes="120px" className="object-contain" unoptimized={!!ph.preview || skipOptimization(src)} />
                    {ph.uploading && <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-0.5 text-center text-xs text-white">Uploading…</span>}
                    {i === 0 && !ph.uploading && <span className="absolute left-0 top-0 bg-gold px-1 text-xs font-semibold">Main</span>}
                  </div>
                  {ph.error && <p className="text-xs text-red-700">{ph.error}</p>}
                  <div className="mt-1 flex justify-between text-xs">
                    {i > 0 ? (
                      <button type="button" onClick={() => movePhotoFirst(ph.key)} className="underline">
                        Make main
                      </button>
                    ) : (
                      <span />
                    )}
                    <button type="button" onClick={() => setPhotos((p) => p.filter((x) => x.key !== ph.key))} className="underline">
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {err("images")}
      </section>

      {/* Basics */}
      <section className="space-y-4 rounded border border-line bg-white p-4">
        <div>
          <label htmlFor="pf-title" className="font-semibold">
            Title
          </label>
          <input id="pf-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Slim Fit Denim Jeans" className={box} />
          {err("title")}
        </div>
        <div>
          <label htmlFor="pf-brand" className="font-semibold">
            Brand
          </label>
          <input id="pf-brand" list={brandListId} value={f.brand} onChange={(e) => set("brand", e.target.value)} autoComplete="off" className={box} />
          <datalist id={brandListId}>
            {brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          {err("brand")}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="pf-category_id" className="font-semibold">
              Category
            </label>
            {!initial && (
              <button type="button" onClick={fillFromLast} className="text-sm underline underline-offset-4">
                Same as last product
              </button>
            )}
          </div>
          <select id="pf-category_id" value={f.category_id} onChange={(e) => set("category_id", e.target.value)} className={box}>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_visible ? "" : " (hidden)"}
              </option>
            ))}
          </select>
          {err("category_id")}
        </div>
        <fieldset id="pf-gender">
          <legend className="font-semibold">For</legend>
          <div className="mt-1 grid grid-cols-4 gap-2">
            {GENDERS.map((g) => (
              <label key={g.value} className={`${chip(f.gender === g.value)} cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold`}>
                <input type="radio" name="gender" value={g.value} checked={f.gender === g.value} onChange={() => set("gender", g.value)} className="sr-only" />
                {g.label}
              </label>
            ))}
          </div>
          {err("gender")}
        </fieldset>
        <fieldset id="pf-condition">
          <legend className="font-semibold">Condition</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {CONDITIONS.map((c) => (
              <label key={c} className={`${chip(f.condition === c)} cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold`}>
                <input type="radio" name="condition" value={c} checked={f.condition === c} onChange={() => set("condition", c)} className="sr-only" />
                {CONDITION_LABELS[c]}
              </label>
            ))}
          </div>
          {err("condition")}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pf-mrp" className="font-semibold">
              MRP (₹)
            </label>
            <input id="pf-mrp" inputMode="numeric" value={f.mrp} onChange={(e) => set("mrp", e.target.value)} className={box} />
            {err("mrp")}
          </div>
          <div>
            <label htmlFor="pf-price" className="font-semibold">
              Our price (₹)
            </label>
            <input id="pf-price" inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value)} className={box} />
            {err("price")}
          </div>
        </div>
        <p className="text-sm" aria-live="polite">
          {off > 0 ? `${off}% off MRP` : " "}
        </p>
      </section>

      {/* Sizes */}
      <section id="pf-variants" aria-labelledby="pf-sizes-h" className="rounded border border-line bg-white p-4">
        <h2 id="pf-sizes-h" className="font-semibold">
          Sizes and quantity
        </h2>
        <p className="text-sm text-muted">Tap a set to add sizes, then set how many of each you have.</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {SIZE_PRESETS.map((p) => (
            <li key={p.label}>
              <button type="button" onClick={() => addSizes(p.sizes)} className="rounded-full border border-ink/40 px-3 py-1.5 text-sm">
                + {p.label}
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setRows((r) => [...r, { key: k(), size: "", colour: "", stock: "1" }])} className="rounded-full border border-ink/40 px-3 py-1.5 text-sm">
              + Other size
            </button>
          </li>
        </ul>
        {rows.length > 0 && (
          <ul className="mt-3 space-y-2">
            {rows.map((r) => (
              <li key={r.key} className="grid grid-cols-[5.5rem_1fr] gap-2 border-b border-line pb-3">
                <input aria-label="Size" placeholder="Size" value={r.size} onChange={(e) => setRow(r.key, { size: e.target.value })} className="min-w-0 rounded border border-ink/40 px-2 py-2" />
                <input aria-label={`Colour for ${r.size || "this size"} (optional)`} placeholder="Colour (optional)" value={r.colour} onChange={(e) => setRow(r.key, { colour: e.target.value })} className="min-w-0 rounded border border-ink/40 px-2 py-2" />
                <div className="col-span-2 flex items-center justify-between">
                  <div className="flex items-center">
                    <button type="button" aria-label={`One less ${r.size}`} onClick={() => bump(r.key, -1)} className="size-11 rounded-l border border-ink/40 text-lg">
                      −
                    </button>
                    <input aria-label={`Quantity of ${r.size || "this size"}`} inputMode="numeric" value={r.stock} onChange={(e) => setRow(r.key, { stock: e.target.value })} className="h-11 w-14 border-y border-ink/40 text-center" />
                    <button type="button" aria-label={`One more ${r.size}`} onClick={() => bump(r.key, 1)} className="size-11 rounded-r border border-ink/40 text-lg">
                      +
                    </button>
                    <span className="ml-2 text-sm text-muted">in stock</span>
                  </div>
                  <button type="button" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} className="px-2 py-2 text-sm underline">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {err("variants")}
      </section>

      <section className="rounded border border-line bg-white p-4">
        <details open={Boolean(f.description)}>
          <summary className="cursor-pointer font-semibold">Description (optional)</summary>
          <label htmlFor="pf-description" className="sr-only">
            Description
          </label>
          <textarea
            id="pf-description"
            rows={4}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Material, fit, any marks to point out…"
            className={box}
          />
          {err("description")}
        </details>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={f.is_published} onChange={(e) => set("is_published", e.target.checked)} className="size-5 accent-ink" />
            Show in shop
          </label>
          <button type="submit" disabled={saving || uploading} className="min-h-12 flex-1 rounded bg-ink font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : uploading ? "Uploading photos…" : initial ? "Save changes" : "Save product"}
          </button>
        </div>
      </div>
      </fieldset>
    </form>
  );
}
