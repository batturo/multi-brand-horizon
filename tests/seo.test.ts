/* eslint-disable @typescript-eslint/no-explicit-any -- parsed JSON-LD and XML are untyped by nature */
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { buildFeedXml, feedCondition } from "@/lib/seo/feed";
import { breadcrumbJsonLd, jsonLdString, localBusinessJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { STATIC_PAGES, buildSitemap } from "@/lib/seo/sitemap";
import { formatDays } from "@/lib/store-info";
import { store } from "@/config/store";
import { demoCatalog } from "./fixtures/sample-catalog";

const catalog = demoCatalog();
const bySlug = (s: string) => catalog.products.find((p) => p.slug === s)!;
const ORIGIN = "http://localhost:3000"; // no domain set in tests

describe("Product JSON-LD", () => {
  it("has the fields Google requires for product snippets", () => {
    const d = productJsonLd(bySlug("sample-slim-fit-jeans")) as Record<string, any>;
    expect(d["@context"]).toBe("https://schema.org");
    expect(d["@type"]).toBe("Product");
    expect(d.name).toBe("SAMPLE Slim Fit Jeans");
    expect(d.image[0]).toMatch(/^https?:\/\/.+\/samples\/sample-02\.svg$/);
    expect(d.brand).toEqual({ "@type": "Brand", name: "Sample Brand B" });
    expect(d.offers).toMatchObject({
      "@type": "Offer",
      price: "1199.00",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
      url: `${ORIGIN}/p/sample-slim-fit-jeans`,
    });
    expect(d.offers.priceSpecification).toMatchObject({ priceType: "https://schema.org/ListPrice", price: "2499.00" });
  });

  it("marks sold out items OutOfStock and new-with-tags as NewCondition", () => {
    const d = productJsonLd(bySlug("sample-kids-track-pants")) as Record<string, any>;
    expect(d.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(d.itemCondition).toBe("https://schema.org/NewCondition");
  });

  it("is safe to put inside a script tag", () => {
    const s = jsonLdString({ name: "</script><script>alert(1)</script>" });
    expect(s).not.toContain("</script>");
    expect(JSON.parse(s).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("Local business JSON-LD", () => {
  it("uses only confirmed facts", () => {
    const d = localBusinessJsonLd() as Record<string, any>;
    expect(d["@type"]).toBe("ClothingStore");
    expect(d.name).toBe(store.name);
    expect(d.telephone).toBe("+919041636322");
    expect(d.sameAs).toEqual(["https://www.instagram.com/multibrandhorizon/"]);
    expect(d.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Naya Nangal",
      addressRegion: "Punjab",
      addressCountry: "IN",
    });
    // Still TODO, so they must not appear.
    for (const k of ["geo", "openingHoursSpecification", "hasMap", "taxID", "legalName", "email"]) {
      expect(d).not.toHaveProperty(k);
    }
  });
});

describe("BreadcrumbList", () => {
  it("numbers items and uses absolute URLs", () => {
    const d = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Apparel", path: "/c/apparel" },
    ]) as Record<string, any>;
    expect(d.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Apparel", item: `${ORIGIN}/c/apparel` },
    ]);
  });
});

describe("sitemap", () => {
  const urls = buildSitemap(catalog).map((e) => e.url);
  it("lists static pages, visible categories and published products", () => {
    for (const p of STATIC_PAGES) expect(urls).toContain(`${ORIGIN}${p}`);
    expect(urls).toContain(`${ORIGIN}/c/apparel`);
    expect(urls).toContain(`${ORIGIN}/p/sample-kids-track-pants`); // sold out stays
  });
  it("leaves out admin, cart, checkout, search, unpublished and hidden", () => {
    expect(urls.some((u) => /\/(admin|cart|checkout|search)/.test(u))).toBe(false);
    expect(urls).not.toContain(`${ORIGIN}/p/sample-sunglasses`);
    expect(urls.some((u) => /electronics|home-decor|gifts|sports/.test(u))).toBe(false);
  });
});

describe("product feed", () => {
  const xml = buildFeedXml(catalog);
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const items: Record<string, any>[] = parsed.rss.channel.item;

  it("is well-formed RSS 2.0 with the Google namespace", () => {
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(parsed.rss["@_version"]).toBe("2.0");
    expect(parsed.rss["@_xmlns:g"]).toBe("http://base.google.com/ns/1.0");
  });

  it("has one item per size with the required fields", () => {
    const jeans = items.filter((i) => i["g:title"].startsWith("SAMPLE Slim Fit Jeans"));
    expect(jeans).toHaveLength(4);
    for (const it of items) {
      for (const f of ["g:id", "g:title", "g:description", "g:link", "g:image_link", "g:availability", "g:price", "g:condition", "g:brand"]) {
        expect(it[f], f).toBeTruthy();
      }
      expect(it["g:price"]).toMatch(/^\d+\.00 INR$/);
      expect(["in_stock", "out_of_stock"]).toContain(it["g:availability"]);
    }
    const j32 = jeans.find((i) => i["g:size"] === 32)!;
    expect(j32).toMatchObject({ "g:price": "1199.00 INR", "g:condition": "used", "g:color": "Blue", "g:gender": "male" });
    expect(j32["g:item_group_id"]).toBeTruthy();
  });

  it("reports sold-out sizes as out of stock and leaves out unpublished items", () => {
    const xl = items.find((i) => i["g:title"] === "SAMPLE Crew Neck T-Shirt, Size XL, Black")!;
    expect(xl["g:availability"]).toBe("out_of_stock");
    expect(xml).not.toContain("Sunglasses");
  });

  it("escapes special characters", () => {
    const p = { ...bySlug("sample-leather-belt"), title: 'Belt & "Buckle" <Brown>' };
    const out = buildFeedXml({ ...catalog, products: [p] });
    expect(XMLValidator.validate(out)).toBe(true);
    expect(out).toContain("Belt &amp; &quot;Buckle&quot; &lt;Brown&gt;");
    const first = [new XMLParser().parse(out).rss.channel.item].flat()[0];
    expect(first["g:title"]).toBe('Belt & "Buckle" <Brown>, Size 32, Brown');
  });

  it("maps conditions to new or used", () => {
    expect(feedCondition(bySlug("sample-flat-sandals"))).toBe("new");
    expect(feedCondition(bySlug("sample-running-shoes"))).toBe("used");
  });
});

describe("formatDays", () => {
  it("writes ranges and lists in plain words", () => {
    expect(formatDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])).toBe("Monday to Saturday");
    expect(formatDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])).toBe("Every day");
    expect(formatDays(["Sunday"])).toBe("Sunday");
    expect(formatDays(["Monday", "Tuesday", "Thursday", "Friday", "Saturday"])).toBe("Monday, Tuesday, Thursday to Saturday");
  });
});
