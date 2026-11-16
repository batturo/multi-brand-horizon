/**
 * Business facts for Multi Brand Horizon.
 *
 * This is the only place the site gets the shop's details from.
 * Anything set to `TODO` has not been confirmed by the shop yet. The site
 * hides a TODO field rather than guessing, and `npm run todos` lists every
 * one that is still open.
 *
 * Do not fill a field with a guess. Ask the shop.
 */

/** Marks a fact the shop has not supplied yet. */
export const TODO = null;
type Todo = typeof TODO;

export type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type DayHours = {
  /** Days these hours apply to, e.g. ["Monday", "Tuesday", ...]. */
  days: Day[];
  /** 24 hour "HH:MM", e.g. "10:00" */
  opens: string;
  closes: string;
};

export const store = {
  name: "Multi Brand Horizon",
  tagline: "All kinds of things under one roof",
  description:
    "Physical multi-brand shop in Naya Nangal, Punjab, selling open-box and surplus branded apparel, footwear and accessories.",

  /** Registered business name, shown in the footer. */
  legalName: TODO as string | Todo,
  /** 15 character GSTIN, shown in the footer. */
  gstin: TODO as string | Todo,

  address: {
    /**
     * TODO: street address. The previous version of this website listed
     * "347, Phase 1-B, Shivalik Avenue". Confirm before using it.
     */
    street: TODO as string | Todo,
    locality: "Naya Nangal",
    city: "Nangal",
    region: "Punjab",
    /** TODO: the previous website listed 140126. Confirm before using it. */
    postalCode: TODO as string | Todo,
    country: "IN",
  },

  /** TODO: latitude and longitude of the shop door, from Google Maps. */
  geo: TODO as { latitude: number; longitude: number } | Todo,
  /** TODO: the shop's Google Maps link (Share > Copy link). */
  mapUrl: TODO as string | Todo,

  /** TODO: nearby landmarks people know, e.g. "Opposite ...", one per line. */
  landmarks: TODO as string[] | Todo,
  /** TODO: short directions from the main road or bus stand, in plain words. */
  directions: TODO as string | Todo,
  /** TODO: parking note, if any. */
  parking: TODO as string | Todo,
  /**
   * TODO: real photos of the shop front and inside. Put the files in
   * public/store/ and list them here, e.g.
   * [{ src: "/store/front.jpg", alt: "Shop front on ... road" }]
   */
  storePhotos: TODO as { src: string; alt: string }[] | Todo,

  /**
   * TODO: opening hours. The previous website listed
   * "Monday to Sunday: 10:00 am to 7:00 pm". Confirm before using it.
   * Format: [{ days: ["Monday", "Tuesday", "Wednesday", "Thursday",
   * "Friday", "Saturday", "Sunday"], opens: "10:00", closes: "19:00" }]
   */
  hours: TODO as DayHours[] | Todo,

  /** Phone numbers in E.164 format. */
  phones: ["+919041636322", "+919463636322"],
  /** TODO: which of the two phones takes WhatsApp orders (E.164, e.g. "+919041636322"). */
  whatsappNumber: TODO as string | Todo,
  /** TODO: shop email, if there is one. */
  email: TODO as string | Todo,

  instagramUrl: "https://www.instagram.com/multibrandhorizon/",

  /** TODO: live domain with https, no trailing slash, e.g. "https://example.in". */
  siteUrl: TODO as string | Todo,

  /** TODO: usual delivery time, e.g. "2 to 4 days in and around Nangal". */
  deliveryTime: TODO as string | Todo,
  /** TODO: towns or pincodes the shop delivers to, in plain words. */
  deliveryAreas: TODO as string | Todo,
  /**
   * The delivery fee itself is edited in the admin (settings table) so the
   * shop can change it without a code release. TODO: set it there.
   */
  /** TODO: the return or exchange rule, in plain words. */
  returnsPolicy: TODO as string | Todo,

  /**
   * TODO: set to true once the shop (ideally with a lawyer or CA) has read
   * and approved the Privacy and Terms pages. Until then they show a note
   * that they are drafts.
   */
  legalPagesApproved: TODO as boolean | Todo,

  currency: "INR",
  locale: "en-IN",
  /** All prices shown include taxes. */
  pricesIncludeTax: true,
} as const;

/**
 * Condition grades. Labels are fixed. The short explanation shown next to
 * each one is the shop's promise to the customer, so it is a TODO until the
 * shop writes or approves it. Suggested wording is in the comments.
 */
export const conditionNotes = {
  // Suggested: "Unused. Original tags attached."
  new_with_tags: TODO as string | Todo,
  // Suggested: "Box opened. Item unused or only tried on. No visible marks."
  open_box_like_new: TODO as string | Todo,
  // Suggested: "Box opened. Small marks that do not affect use. See photos."
  open_box_minor_marks: TODO as string | Todo,
};
