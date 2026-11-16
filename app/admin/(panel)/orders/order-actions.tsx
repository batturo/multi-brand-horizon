"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrderStatusAction } from "@/app/admin/actions";
import { allowedNextStatuses, type OrderStatus } from "@/lib/orders/status";

const LABEL: Record<OrderStatus, string> = {
  pending: "Back to pending",
  confirmed: "Confirm (takes stock)",
  dispatched: "Mark dispatched",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export function OrderActions({ id, number, status }: { id: string; number: string; status: OrderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = allowedNextStatuses(status);
  if (next.length === 0) return null;

  function go(to: OrderStatus) {
    if (to === "cancelled" && !window.confirm(`Cancel order ${number}?${status !== "pending" ? " Its stock goes back on the shelf." : ""}`)) return;
    setError(null);
    start(async () => {
      const r = await setOrderStatusAction(id, to);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {next.map((to) => (
          <button
            key={to}
            type="button"
            disabled={pending}
            onClick={() => go(to)}
            className={`min-h-11 flex-1 rounded px-4 font-semibold disabled:opacity-60 ${
              to === "cancelled" ? "border-2 border-red-700 text-red-800" : "bg-ink text-white"
            }`}
          >
            {LABEL[to]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
