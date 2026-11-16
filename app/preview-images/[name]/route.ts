import { backendMode } from "@/lib/backend";

/** Serves photos uploaded in the local preview. 404 everywhere else. */
export async function GET(_req: Request, ctx: RouteContext<"/preview-images/[name]">) {
  const { name } = await ctx.params;
  if (backendMode() !== "local" || !/^[0-9a-f-]{36}\.(webp|jpg|png)$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const { getPreviewImage } = await import("@/lib/admin/preview-images");
  const img = getPreviewImage(name);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(img.bytes as BodyInit, {
    headers: { "content-type": img.type, "cache-control": "private, max-age=3600" },
  });
}
