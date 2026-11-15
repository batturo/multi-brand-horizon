"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  duplicateProductAction,
  markSoldAction,
  setPublishedAction,
  setStockAction,
} from "@/app/admin/actions";
import type { AdminProduct, AdminVariant } from "@/lib/admin/types";
import { productImageUrl, skipOptimization } from "@/lib/catalog/images";
import { conditionLabel } from "@/lib/catalog/conditions";
import { formatINR } from "@/lib/pricing";

export function ProductsTable({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const r = await fn();
      setNotice(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Failed." });
      router.refresh();
    });

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (products.length === 0) return <p className="rounded bg-white p-4">No products here.</p>;

  const ids = [...selected];
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 bg-[#f6f6f6] px-4 py-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-ink"
            checked={selected.size === products.length}
            onChange={(e) => setSelected(e.target.checked ? new Set(products.map((p) => p.id)) : new Set())}
          />
          Select all
        </label>
        {selected.size > 0 && (
          <>
            <span className="text-sm text-muted">{selected.size} selected</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setPublishedAction(ids, false), `${ids.length} unpublished.`)}
              className="rounded border-2 border-ink bg-white px-3 py-1.5 text-sm font-semibold"
            >
              Unpublish
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setPublishedAction(ids, true), `${ids.length} published.`)}
              className="rounded bg-ink px-3 py-1.5 text-sm font-semibold text-white"
            >
              Publish
            </button>
          </>
        )}
      </div>
      <p aria-live="polite" className={`min-h-6 text-sm ${notice?.ok === false ? "font-medium text-red-700" : ""}`}>
        {notice?.text}
      </p>

      <ul className="space-y-3">
        {products.map((p) => {
          const img = p.images[0];
          const src = img ? productImageUrl(img.src) : null;
          return (
            <li key={p.id} className="rounded border border-line bg-white p-3">
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${p.title}`}
                  className="mt-1 size-5 shrink-0 accent-ink"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded border border-line bg-white">
                  {src && <Image src={src} alt="" fill sizes="64px" className="object-contain" unoptimized={skipOptimization(src)} />}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <Link href={`/admin/products/${p.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-muted">
                    {p.brand} · {p.category_name} · {conditionLabel(p.condition)}
                  </p>
                  <p>
                    <strong>{formatINR(p.price)}</strong> <span className="text-muted">MRP {formatINR(p.mrp)}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    <Badge on={p.is_published} onText="In shop" offText="Draft" />
                    {p.total_stock === 0 && <span className="rounded bg-ink px-1.5 text-xs text-white">Sold out</span>}
                    {!p.category_visible && <span className="rounded bg-line px-1.5 text-xs">Hidden category</span>}
                    {p.is_sample && <span className="rounded bg-gold px-1.5 text-xs">Sample</span>}
                  </p>
                </div>
              </div>

              <StockEditor variants={p.variants} onSaved={() => router.refresh()} />

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Link href={`/admin/products/${p.id}`} className="rounded border border-ink px-3 py-2 font-semibold">
                  Edit
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await duplicateProductAction(p.id);
                      if (r.ok) router.push(`/admin/products/${r.data.id}?copied=1`);
                      else setNotice({ ok: false, text: r.error });
                    })
                  }
                  className="rounded border border-ink px-3 py-2 font-semibold"
                >
                  Duplicate
                </button>
                {p.total_stock > 0 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Mark "${p.title}" as sold? All sizes go to 0. The page stays up as Sold out.`)) {
                        run(() => markSoldAction(p.id), `${p.title} marked sold.`);
                      }
                    }}
                    className="rounded border border-ink px-3 py-2 font-semibold"
                  >
                    Mark sold
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => setPublishedAction([p.id], !p.is_published),
                      `${p.title} ${p.is_published ? "unpublished" : "published"}.`,
                    )
                  }
                  className="rounded border border-ink px-3 py-2 font-semibold"
                >
                  {p.is_published ? "Unpublish" : "Publish"}
                </button>
                {p.is_published && (
                  <Link href={`/p/${p.slug}`} target="_blank" className="px-1 py-2 underline underline-offset-4">
                    View
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badge({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span className={`rounded px-1.5 text-xs ${on ? "bg-green-800 text-white" : "border border-ink/40"}`}>
      {on ? onText : offText}
    </span>
  );
}

/** Quick stock edit: one small number box per size, saved on change. */
function StockEditor({ variants, onSaved }: { variants: AdminVariant[]; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, String(v.stock)])),
  );
  const [status, setStatus] = useState<Record<string, "saving" | "saved" | "error">>({});

  async function save(v: AdminVariant) {
    const raw = values[v.id]?.trim() ?? "";
    const n = Number(raw);
    if (!/^\d+$/.test(raw)) {
      setStatus((s) => ({ ...s, [v.id]: "error" }));
      return;
    }
    if (n === v.stock) return;
    setStatus((s) => ({ ...s, [v.id]: "saving" }));
    const r = await setStockAction(v.id, n);
    setStatus((s) => ({ ...s, [v.id]: r.ok ? "saved" : "error" }));
    if (r.ok) onSaved();
  }

  return (
    <fieldset className="mt-3">
      <legend className="text-xs font-semibold uppercase text-muted">Stock</legend>
      <ul className="mt-1 flex flex-wrap gap-2">
        {variants.map((v) => {
          const label = [v.size, v.colour].filter(Boolean).join(" / ") || "One size";
          const st = status[v.id];
          return (
            <li key={v.id}>
              <label className="flex items-center gap-1 rounded border border-line px-2 py-1 text-sm">
                <span>{label}</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label={`Stock for ${label}`}
                  value={values[v.id] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [v.id]: e.target.value }))}
                  onBlur={() => save(v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className={`w-12 rounded border px-1 py-1 text-center ${st === "error" ? "border-red-700" : "border-ink/40"}`}
                />
                <span aria-live="polite" className="w-4 text-xs">
                  {st === "saving" ? "…" : st === "saved" ? "✓" : st === "error" ? "!" : ""}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
