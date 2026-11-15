import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2">This page does not exist or the item is no longer listed.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="rounded bg-ink px-5 py-3 font-semibold text-white">
          Go to the home page
        </Link>
        <Link href="/search" className="rounded border-2 border-ink px-5 py-3 font-semibold">
          See all items
        </Link>
      </div>
    </div>
  );
}
