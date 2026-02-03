import { NextResponse } from "next/server";

// Прод-окружение (чтение) — уже используется в /api/products
const STRAPI_URL = process.env.STRAPI_URL || "";
const STRAPI_BASE = process.env.STRAPI_BASE || "";
// API токен для авторизации в Strapi (нужен для загрузки и обновления)
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || "";

// Примечание: согласно документации Strapi, папки - это функция только админ-панели.
// Файлы, загруженные через REST API, автоматически попадают в папку "API Uploads".

function getStrapiOrigin(): string {
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

  // Можно загрузить только Android, только iOS, или оба
  if (!(androidFile instanceof File) && !(iosFile instanceof File)) {
    return NextResponse.json(
      { error: "Need at least one file: android (.glb) or ios (.usdz)" },
      { status: 400 }
    );
  }

  const android = androidFile instanceof File ? androidFile : null;
  const ios = iosFile instanceof File ? iosFile : null;

  // Валидация расширений файлов
  if (android) {
    const androidName = android.name?.toLowerCase() ?? "";
    if (!androidName.endsWith(".glb")) {
      return NextResponse.json(
        { error: "Android file must be .glb" },
        { status: 400 }
      );
    }
  }

  if (ios) {
    const iosName = ios.name?.toLowerCase() ?? "";
    if (!iosName.endsWith(".usdz")) {
      return NextResponse.json(
        { error: "iOS file must be .usdz" },
        { status: 400 }
      );
    }
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
  // Добавляем токен авторизации, если он задан
  if (STRAPI_API_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
  }

  try {
    let androidId: number | undefined;
    let iosId: number | undefined;

    const uploadOne = async (file: File): Promise<{ id: number }> => {
      const fd = new FormData();
      fd.append("files", file);

      // Файлы загружаются через стандартный Strapi API
      // Они автоматически попадают в папку "API Uploads" в Media Library
      const uploadUrl = `${origin}/api/upload`;

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

    // Загружаем только те файлы, которые были предоставлены
    const uploadPromises: Promise<{ id: number; type: "android" | "ios" }>[] = [];
    if (android) {
      uploadPromises.push(uploadOne(android).then(res => ({ ...res, type: "android" as const })));
    }
    if (ios) {
      uploadPromises.push(uploadOne(ios).then(res => ({ ...res, type: "ios" as const })));
    }

    const uploadResults = await Promise.all(uploadPromises);

    for (const result of uploadResults) {
      if (result.type === "android") {
        androidId = result.id;
      } else if (result.type === "ios") {
        iosId = result.id;
      }
    }

    // Обновляем продукты с новыми файлами (только те, которые были загружены)
    for (const productId of childIds) {
      const updateData: { ar_model_and?: number; ar_model_ios?: number } = {};
      if (androidId !== undefined) {
        updateData.ar_model_and = androidId;
      }
      if (iosId !== undefined) {
        updateData.ar_model_ios = iosId;
      }

      const patchUrl = `${origin}/api/products/${productId}`;
      const res = await fetch(patchUrl, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: updateData,
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