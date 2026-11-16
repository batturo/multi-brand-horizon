import { store } from "@/config/store";

export function TextPage({ children }: { children: React.ReactNode }) {
  return <article className="prose-page mx-auto max-w-6xl px-4 py-8">{children}</article>;
}

/** Shown on Privacy and Terms until the shop approves the wording. */
export function DraftNotice() {
  if (store.legalPagesApproved) return null;
  return (
    <p className="rounded border-2 border-gold-deep p-3 text-sm">
      This page is a draft and is being reviewed by the shop. If anything is unclear, please call us.
    </p>
  );
}

export function ContactLine() {
  return (
    <>
      Call{" "}
      {store.phones.map((p, i) => (
        <span key={p}>
          {i > 0 && " or "}
          <a href={`tel:${p}`}>{p.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2")}</a>
        </span>
      ))}
      {store.email && (
        <>
          , or email <a href={`mailto:${store.email}`}>{store.email}</a>
        </>
      )}
      .
    </>
  );
}
