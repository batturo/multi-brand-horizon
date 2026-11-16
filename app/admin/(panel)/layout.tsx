import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOutAction } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

const nav = [
  ["/admin", "Home"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/products/new", "+ Add"],
  ["/admin/settings", "Settings"],
] as const;

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Loading admin…</p>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const s = await getAdminSession();
  if (s.status === "signed_out") redirect("/admin/login");
  if (s.status === "unconfigured") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold">Admin is not set up</h1>
        <p className="mt-2">Connect Supabase first (see the README).</p>
      </div>
    );
  }
  if (s.status === "not_admin") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold">Not an admin</h1>
        <p className="mt-2">
          You are logged in as {s.email ?? "this user"}, but this login is not an admin. Ask the owner to add you.
        </p>
        <form action={signOutAction} className="mt-4">
          <button className="rounded bg-ink px-4 py-2 font-semibold text-white">Log out</button>
        </form>
      </div>
    );
  }
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f6f6f6]">
      {s.preview && (
        <p className="bg-gold px-4 py-1.5 text-center text-xs font-semibold text-ink">
          Local preview: changes live only in memory and are lost when the preview server stops.
        </p>
      )}
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-3">
          <Link href="/admin" className="mr-auto font-bold text-gold">
            Admin
          </Link>
          <Link href="/" className="text-sm underline underline-offset-4" target="_blank">
            View shop
          </Link>
          {!s.preview && (
            <form action={signOutAction}>
              <button className="px-2 py-2 text-sm underline underline-offset-4">Log out</button>
            </form>
          )}
        </div>
        <nav aria-label="Admin" className="mx-auto max-w-5xl px-2">
          <ul className="flex overflow-x-auto whitespace-nowrap text-sm">
            {nav.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-block px-3 py-3 hover:text-gold">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        {children}
      </main>
    </div>
  );
}
