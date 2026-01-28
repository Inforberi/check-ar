import { NextResponse } from "next/server";
import type {
  StrapiResponse,
  NormalizedResponse,
  VarProduct,
  ProductChild,
} from "@/lib/types";

const STRAPI_URL = process.env.STRAPI_URL || '';
const STRAPI_BASE = process.env.STRAPI_BASE || '';

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
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Strapi API error: ${response.status}`);
    }

    const rawData: StrapiResponse = await response.json();

    // Helper to extract media URL from Strapi v4 format
    const getMediaUrl = (
      media?: { data: { id: number; attributes: { url: string } } | null }
    ): string | undefined => {
      const url = media?.data?.attributes?.url;
      if (!url) return undefined;
      return url.startsWith("http") ? url : `${STRAPI_BASE}${url}`;
    };

    // Normalize the Strapi v4 response (flatten { id, attributes } structure)
    const normalizedData: NormalizedResponse = {
      data: (rawData.data || []).map((item): VarProduct => {
        const childrenData = item.attributes?.childrens?.data || [];

        const childrens: ProductChild[] = childrenData.map(
          (child): ProductChild => ({
            id: child.id,
            name: child.attributes?.name || "",
            slug_item: child.attributes?.slug_item || "",
            in_stock: child.attributes?.in_stock ?? false,
            hero_image: getMediaUrl(child.attributes?.hero_image),
            ar_model_ios: getMediaUrl(child.attributes?.ar_model_ios),
            ar_model_and: getMediaUrl(child.attributes?.ar_model_and),
          })
        );

        return {
          id: item.id,
          name: item.attributes?.name || "",
          childrens,
        };
      }),
      meta: rawData.meta,
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
