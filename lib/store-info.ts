import { store, type Day, type DayHours } from "@/config/store";

export const WEEK: Day[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** ["Monday".."Saturday"] -> "Monday to Saturday"; gaps are listed with commas. */
export function formatDays(days: Day[]): string {
  const idx = [...new Set(days)].map((d) => WEEK.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (idx.length === 7) return "Every day";
  const runs: number[][] = [];
  for (const i of idx) {
    const last = runs.at(-1);
    if (last && i === last[last.length - 1] + 1) last.push(i);
    else runs.push([i]);
  }
  return runs
    .map((r) => (r.length >= 3 ? `${WEEK[r[0]]} to ${WEEK[r[r.length - 1]]}` : r.map((i) => WEEK[i]).join(", ")))
    .join(", ");
}

/** +919041636322 -> +91 90416 36322 */
export function formatPhone(e164: string): string {
  const m = e164.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** Address lines, leaving out anything still TODO. */
export function addressLines(): string[] {
  const a = store.address;
  return [a.street, [a.locality, a.region].filter(Boolean).join(", "), a.postalCode ? `PIN ${a.postalCode}` : null].filter(
    (x): x is string => Boolean(x),
  );
}

/** True once the street address has been confirmed. */
export function hasFullAddress(): boolean {
  return Boolean(store.address.street && store.address.postalCode);
}

/** Link to the shop on Google Maps, only from confirmed data. */
export function mapLink(): string | null {
  if (store.mapUrl) return store.mapUrl;
  if (store.geo) {
    return `https://www.google.com/maps/search/?api=1&query=${store.geo.latitude},${store.geo.longitude}`;
  }
  return null;
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function hoursLines(hours: DayHours[] | null = store.hours): { days: string; time: string }[] {
  return (hours ?? []).map((h) => ({ days: formatDays(h.days), time: `${to12h(h.opens)} to ${to12h(h.closes)}` }));
}

export function whatsappNumber(): string | null {
  return store.whatsappNumber;
}
