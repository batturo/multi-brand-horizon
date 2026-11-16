import { store } from "@/config/store";
import { addressLines, formatPhone, hoursLines, mapLink } from "@/lib/store-info";

/** Address, hours, map link and phones. Unconfirmed details are left out. */
export function StoreLocation({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const map = mapLink();
  const hours = hoursLines();
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <H className="text-lg font-semibold text-gold">Address</H>
        <address className="mt-2 not-italic leading-7">
          <span className="block font-semibold">{store.name}</span>
          {addressLines().map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </address>
        {map && (
          <a
            href={map}
            rel="noopener"
            className="mt-3 inline-block rounded bg-gold px-4 py-2 font-semibold text-ink hover:bg-white"
          >
            Open in Google Maps
          </a>
        )}
      </div>
      <div>
        <H className="text-lg font-semibold text-gold">Opening hours</H>
        {hours.length > 0 ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {hours.map((h) => (
              <div key={h.days} className="contents">
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2">Please call before visiting to check we are open.</p>
        )}
        <H className="mt-4 text-lg font-semibold text-gold">Call</H>
        <ul className="mt-2 space-y-1">
          {store.phones.map((p) => (
            <li key={p}>
              <a className="underline underline-offset-4 hover:text-gold" href={`tel:${p}`}>
                {formatPhone(p)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
