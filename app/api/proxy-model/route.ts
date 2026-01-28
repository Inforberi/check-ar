import { NextRequest, NextResponse } from "next/server";

// Через .env: ALLOWED_ORIGINS=https://media.fiftyfourms.com,https://strapi.fiftyfourms.com
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []
) as string[];

function isAllowedUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const origin = `${u.protocol}//${u.host}`;
    return ALLOWED_ORIGINS.some((o) => origin === o || u.host.endsWith(".fiftyfourms.com"));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  const decoded = decodeURIComponent(urlParam);
  if (!isAllowedUrl(decoded)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(decoded, {
      headers: { "User-Agent": "AR-Model-Dashboard/1.0" },
      cache: "force-cache",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status }
      );
    }
    const contentType =
      res.headers.get("Content-Type") ||
      (decoded.toLowerCase().endsWith(".glb")
        ? "model/gltf-binary"
        : decoded.toLowerCase().endsWith(".usdz")
          ? "model/vnd.usdz+zip"
          : "application/octet-stream");

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (e) {
    console.error("[proxy-model]", e);
    return NextResponse.json(
      { error: "Failed to fetch model" },
      { status: 502 }
    );
  }
}
