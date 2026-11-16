import { conditionNotes } from "@/config/store";

export const CONDITIONS = [
  "new_with_tags",
  "open_box_like_new",
  "open_box_minor_marks",
] as const;

export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  new_with_tags: "New with tags",
  open_box_like_new: "Open box like new",
  open_box_minor_marks: "Open box minor marks",
};

export function conditionLabel(c: Condition): string {
  return CONDITION_LABELS[c];
}

/** Short explanation for a condition, or null until the shop approves one. */
export function conditionNote(c: Condition): string | null {
  return conditionNotes[c];
}

/** schema.org itemCondition for structured data. */
export function schemaOrgCondition(c: Condition): string {
  return c === "new_with_tags"
    ? "https://schema.org/NewCondition"
    : "https://schema.org/UsedCondition";
}

export function isCondition(v: unknown): v is Condition {
  return typeof v === "string" && (CONDITIONS as readonly string[]).includes(v);
}
