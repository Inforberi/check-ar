import { NextResponse } from "next/server";

// Прод-окружение (чтение) — уже используется в /api/products
const STRAPI_URL = process.env.STRAPI_URL || "";
const STRAPI_BASE = process.env.STRAPI_BASE || "";

// Отдельный Strapi для ЗАГРУЗКИ моделей (временный / локальный)
const STRAPI_UPLOAD_BASE = process.env.STRAPI_UPLOAD_BASE || "";
const STRAPI_UPLOAD_API_TOKEN = process.env.STRAPI_UPLOAD_API_TOKEN || "";
// Примечание: согласно документации Strapi, папки - это функция только админ-панели.
// Файлы, загруженные через REST API, автоматически попадают в папку "API Uploads".
// Параметр path работает только для S3 провайдера и указывает путь в S3, а не в Media Library.
const STRAPI_UPLOAD_FOLDER_PATH = process.env.STRAPI_UPLOAD_FOLDER_PATH || "";

function getStrapiOrigin(): string {
  // 1) если есть отдельный Strapi для upload — используем его
  if (STRAPI_UPLOAD_BASE) return STRAPI_UPLOAD_BASE.replace(/\/$/, "");
  // 2) иначе падаем обратно на основной STRAPI_BASE / STRAPI_URL
  if (STRAPI_BASE) return STRAPI_BASE.replace(/\/$/, "");
  if (STRAPI_URL) return new URL(STRAPI_URL).origin;
  return "";
}

export async function POST(request: Request) {
  const origin = getStrapiOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "STRAPI_URL or STRAPI_BASE not configured" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const androidFile = formData.get("android");
  const iosFile = formData.get("ios");
  const childIdsRaw = formData.get("childIds");

  if (!(androidFile instanceof File) || !(iosFile instanceof File)) {
    return NextResponse.json(
      { error: "Need both android (.glb) and ios (.usdz) files" },
      { status: 400 }
    );
  }

  const android = androidFile as File;
  const ios = iosFile as File;
  const androidName = android.name?.toLowerCase() ?? "";
  const iosName = ios.name?.toLowerCase() ?? "";
  if (!androidName.endsWith(".glb") || !iosName.endsWith(".usdz")) {
    return NextResponse.json(
      { error: "Android file must be .glb, iOS file must be .usdz" },
      { status: 400 }
    );
  }

  let childIds: number[];
  try {
    const parsed = JSON.parse(String(childIdsRaw ?? "[]"));
    childIds = Array.isArray(parsed)
      ? parsed.filter((x: unknown) => typeof x === "number")
      : [];
  } catch {
    childIds = [];
  }

  if (childIds.length === 0) {
    return NextResponse.json(
      { error: "childIds must be a non-empty array of product ids" },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = {};
  // Токен для временного Strapi не обязателен
  if (STRAPI_UPLOAD_API_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_UPLOAD_API_TOKEN}`;
  }

  try {
    let androidId: number;
    let iosId: number;

    const uploadOne = async (file: File): Promise<{ id: number }> => {
      const fd = new FormData();
      fd.append("files", file);

      // Параметр path работает только для S3 провайдера (указывает путь в S3)
      // Для Media Library файлы всегда попадают в папку "API Uploads"
      let uploadUrl = `${origin}/api/upload`;
      if (STRAPI_UPLOAD_FOLDER_PATH) {
        // Если используется S3, можно указать путь в S3
        uploadUrl = `${origin}/api/upload?path=${encodeURIComponent(STRAPI_UPLOAD_FOLDER_PATH)}`;
        fd.append("path", STRAPI_UPLOAD_FOLDER_PATH);
      }

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Strapi upload failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      const entry = Array.isArray(data) ? data[0] : data;
      const id = entry?.id ?? entry?.data?.id;
      if (typeof id !== "number") {
        throw new Error("Strapi upload response missing file id");
      }
      return { id };
    };

    const [androidRes, iosRes] = await Promise.all([
      uploadOne(android),
      uploadOne(ios),
    ]);

    androidId = androidRes.id;
    iosId = iosRes.id;

    // Обновляем продукты с новыми файлами
    for (const productId of childIds) {
      const patchUrl = `${origin}/api/products/${productId}`;
      const res = await fetch(patchUrl, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            ar_model_and: androidId,
            ar_model_ios: iosId,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          `[upload-models] PATCH product ${productId} failed:`,
          res.status,
          text
        );
        return NextResponse.json(
          {
            error: `Failed to update product ${productId}: ${res.status}`,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      androidFileId: androidId,
      iosFileId: iosId,
      updatedProducts: childIds.length,
    });
  } catch (e) {
    console.error("[upload-models]", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Upload failed",
      },
      { status: 502 }
    );
  }
}