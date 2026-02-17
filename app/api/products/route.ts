import { NextResponse } from "next/server";
import type {
  NormalizedResponse,
  VarProduct,
  ProductChild,
} from "@/lib/types";

const STRAPI_URL = process.env.STRAPI_URL || '';
const STRAPI_BASE = process.env.STRAPI_BASE || '';

/** Стабильный числовой id из documentId для статусов/вариантов (Strapi 5 может не отдавать id) */
function stableChildId(child: Record<string, unknown>): number {
  if (typeof child.id === "number" && Number.isFinite(child.id)) return child.id;
  const docId = String(child.documentId ?? "");
  if (!docId) return 0;
  let h = 0;
  for (let i = 0; i < docId.length; i++) {
    h = (h * 31 + docId.charCodeAt(i)) >>> 0;
  }
  return (h % 2147483647) || 1;
}

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("pageSize") || "100";

  try {
    const url = new URL(STRAPI_URL);
    url.searchParams.set("pagination[page]", page);
    url.searchParams.set("pagination[pageSize]", pageSize);
    url.searchParams.set("locale", "ru");
    // Брать только опубликованные записи (Strapi draft & publish)
    url.searchParams.set("publicationState", "live");
    url.searchParams.set("fields[0]", "name");
    url.searchParams.set("populate[childrens][fields][0]", "name");
    url.searchParams.set("populate[childrens][fields][1]", "slug_item");
    url.searchParams.set("populate[childrens][fields][2]", "in_stock");
    url.searchParams.set(
      "populate[childrens][populate][hero_image][fields][0]",
      "url"
    );
    url.searchParams.set(
      "populate[childrens][populate][ar_model_ios][fields][0]",
      "url"
    );
    url.searchParams.set(
      "populate[childrens][populate][ar_model_and][fields][0]",
      "url"
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    console.log("[v0] Fetching from Strapi:", url.toString());

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        // Без v4: Strapi 5 возвращает documentId, нужный для PUT /api/products/:documentId
        ...(process.env.STRAPI_V4_RESPONSE === "1" ? { "Strapi-Response-Format": "v4" } : {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Strapi API error: ${response.status}`);
    }

    const rawData = await response.json();
    const items = rawData.data || [];

    const isV4 = items.length === 0 || items[0].attributes != null;

    // URL медиа: v4 — data.attributes.url, v5 — плоский url или data.attributes.url
    const getMediaUrl = (media: unknown): string | undefined => {
      if (!media || typeof media !== "object") return undefined;
      const m = media as Record<string, unknown>;
      let url: string | undefined;
      if (typeof m.url === "string") url = m.url;
      else if (m.data && typeof m.data === "object") {
        const d = (m.data as Record<string, unknown>).attributes ?? m.data;
        url = typeof d === "object" && d && typeof (d as Record<string, unknown>).url === "string"
          ? (d as Record<string, string>).url
          : undefined;
      }
      if (!url) return undefined;
      return url.startsWith("http") ? url : `${STRAPI_BASE}${url}`;
    };

    const normalizedData: NormalizedResponse = {
      data: items.map((item: Record<string, unknown>): VarProduct => {
        if (isV4) {
          const childrenData = (item.attributes as Record<string, unknown>)?.childrens as { data?: Array<{ id: number; attributes: Record<string, unknown> }> } | undefined;
          const childrenList = childrenData?.data ?? [];
          const childrens: ProductChild[] = childrenList.map(
            (child): ProductChild => ({
              id: child.id,
              name: String((child.attributes?.name as string) ?? ""),
              slug_item: String((child.attributes?.slug_item as string) ?? ""),
              in_stock: Boolean(child.attributes?.in_stock ?? false),
              hero_image: getMediaUrl(child.attributes?.hero_image),
              ar_model_ios: getMediaUrl(child.attributes?.ar_model_ios),
              ar_model_and: getMediaUrl(child.attributes?.ar_model_and),
            })
          );
          return {
            id: item.id as number,
            name: String(((item.attributes as Record<string, unknown>)?.name as string) ?? ""),
            childrens,
          };
        }
        // Strapi 5: плоский формат; childrens может быть под item.childrens или в другом виде
        const rawChildren = (item.childrens ?? (item.attributes as Record<string, unknown>)?.childrens) as unknown;
        const childrenList = Array.isArray(rawChildren)
          ? rawChildren
          : (rawChildren && typeof rawChildren === "object" && Array.isArray((rawChildren as { data?: unknown[] }).data))
            ? (rawChildren as { data: Array<Record<string, unknown>> }).data
            : [];
        const childrens: ProductChild[] = childrenList.map(
          (child: Record<string, unknown>): ProductChild => ({
            id: stableChildId(child),
            documentId: typeof child.documentId === "string" ? child.documentId : undefined,
            name: String(child.name ?? (child.attributes as Record<string, unknown>)?.name ?? ""),
            slug_item: String(child.slug_item ?? (child.attributes as Record<string, unknown>)?.slug_item ?? ""),
            in_stock: Boolean(child.in_stock ?? (child.attributes as Record<string, unknown>)?.in_stock ?? false),
            hero_image: getMediaUrl(child.hero_image ?? (child.attributes as Record<string, unknown>)?.hero_image),
            ar_model_ios: getMediaUrl(child.ar_model_ios ?? (child.attributes as Record<string, unknown>)?.ar_model_ios),
            ar_model_and: getMediaUrl(child.ar_model_and ?? (child.attributes as Record<string, unknown>)?.ar_model_and),
          })
        );
        const vpId = typeof item.id === "number" && Number.isFinite(item.id)
          ? item.id
          : (() => { let h = 0; const s = String(item.documentId ?? ""); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h % 2147483647) || 1; })();
        return {
          id: vpId,
          name: String(item.name ?? ""),
          childrens,
        };
      }),
      meta: rawData.meta ?? {},
    };

    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error("[v0] Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products from Strapi" },
      { status: 500 }
    );
  }
};
