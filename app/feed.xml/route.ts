import { getCatalog } from "@/lib/catalog/data";
import { buildFeedXml } from "@/lib/seo/feed";

/** Product feed for Google Merchant Center and Meta catalogues. */
export async function GET() {
  const xml = buildFeedXml(await getCatalog());
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
