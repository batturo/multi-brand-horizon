"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCategoryAction, saveSettingsAction } from "@/app/admin/actions";
import type { AdminCategory } from "@/lib/admin/types";

const box = "mt-1 block w-full rounded border border-ink/40 bg-white px-3 py-2.5 text-base";

function Status({ msg }: { msg: { ok: boolean; text: string } | null }) {
  return (
    <p aria-live="polite" className={`min-h-6 text-sm ${msg && !msg.ok ? "font-medium text-red-700" : "text-green-800"}`}>
      {msg?.text}
    </p>
  );
}

export function ShopSettingsForm({ banner, fee }: { banner: string; fee: number | null }) {
  const router = useRouter();
  const [b, setB] = useState(banner);
  const [f, setFee] = useState(fee === null ? "" : String(fee));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4 rounded border border-line bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettingsAction(b, f);
          setMsg(r.ok ? { ok: true, text: "Saved. The shop shows it now." } : { ok: false, text: r.error });
          router.refresh();
        });
      }}
    >
      <div>
        <label htmlFor="banner" className="font-semibold">
          Sale banner
        </label>
        <input id="banner" value={b} maxLength={200} onChange={(e) => setB(e.target.value)} placeholder="e.g. Extra 10% off on all footwear this week" className={box} />
        <p className="mt-1 text-xs text-muted">Shown at the top of the home page. Leave empty to hide it. Only announce real offers.</p>
      </div>
      <div>
        <label htmlFor="fee" className="font-semibold">
          Delivery fee (₹)
        </label>
        <input id="fee" inputMode="numeric" value={f} onChange={(e) => setFee(e.target.value)} className={`${box} max-w-40`} />
        <p className="mt-1 text-xs text-muted">0 for free delivery. Leave empty to confirm the fee with each customer on WhatsApp.</p>
      </div>
      <button disabled={pending} className="min-h-11 rounded bg-ink px-5 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <Status msg={msg} />
    </form>
  );
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function CategoryEditor({ category: c }: { category: AdminCategory }) {
  const router = useRouter();
  const [visible, setVisible] = useState(c.is_visible);
  const [intro, setIntro] = useState(c.intro ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const words = wordCount(intro);
  const id = `intro-${c.id}`;

  return (
    <form
      className="rounded border border-line bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveCategoryAction(c.id, visible, intro);
          setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error });
          router.refresh();
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          {c.name} <span className="text-sm font-normal text-muted">({c.product_count} products)</span>
        </h3>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-5 accent-ink" />
          Visible in shop
        </label>
      </div>
      <label htmlFor={id} className="mt-3 block text-sm font-semibold">
        Intro text
      </label>
      <textarea id={id} rows={5} value={intro} onChange={(e) => setIntro(e.target.value)} className={box} aria-describedby={`${id}-count`} />
      <p id={`${id}-count`} className={`mt-1 text-xs ${words > 0 && (words < 80 || words > 120) ? "text-gold-deep" : "text-muted"}`}>
        {words} words{words > 0 && words < 80 ? " (aim for 80 to 120)" : words > 120 ? " (a bit long; aim for 80 to 120)" : ""}
      </p>
      <button disabled={pending} className="mt-2 min-h-11 rounded bg-ink px-5 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <Status msg={msg} />
    </form>
  );
}
