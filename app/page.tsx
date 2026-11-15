import { store } from "@/config/store";

// Phase 1 placeholder. The real home page (sale banner, category tiles, new
// arrivals, brands, store location) is built in Phase 2.
export default function HomePage() {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-bold">{store.name}</h1>
        <p className="mt-2 text-lg text-gold">{store.tagline}</p>
        <p className="mt-6 max-w-prose text-white/80">
          Open-box and surplus branded apparel, footwear and accessories in Naya Nangal, Punjab.
          Our online shop is being set up.
        </p>
      </div>
    </section>
  );
}
