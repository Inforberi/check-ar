import { NextResponse } from "next/server";
import { query, type ProductVariantRow } from "@/lib/db";
import type { VarProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = body.data as VarProduct[] | undefined;
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Expected { data: VarProduct[] }" },
        { status: 400 }
      );
    }

    const variants: { variantId: number; varProductId: number; arIos: string | null; arAndroid: string | null }[] = [];
    for (const vp of data) {
      const children = vp.childrens ?? [];
      for (const c of children) {
        variants.push({
          variantId: c.id,
          varProductId: vp.id,
          arIos: c.ar_model_ios ?? null,
          arAndroid: c.ar_model_and ?? null,
        });
      }
    }

    for (const v of variants) {
      const { rows } = await query<ProductVariantRow>(
        "SELECT variant_id, ar_model_ios, ar_model_android, human_verified, manual_incorrect, notes FROM product_variants WHERE variant_id = $1",
        [v.variantId]
      );
      const existing = rows[0];

      if (!existing) {
        await query(
          `INSERT INTO product_variants (variant_id, var_product_id, ar_model_ios, ar_model_android, human_verified, manual_incorrect, notes, updated_at)
           VALUES ($1, $2, $3, $4, FALSE, FALSE, NULL, NOW())
           ON CONFLICT (variant_id) DO UPDATE SET
             var_product_id = EXCLUDED.var_product_id,
             ar_model_ios = EXCLUDED.ar_model_ios,
             ar_model_android = EXCLUDED.ar_model_android,
             updated_at = NOW()`,
          [v.variantId, v.varProductId, v.arIos, v.arAndroid]
        );
        continue;
      }

      const iosChanged = (existing.ar_model_ios ?? null) !== v.arIos;
      const androidChanged = (existing.ar_model_android ?? null) !== v.arAndroid;
      if (!iosChanged && !androidChanged) continue;

      await query(
        `UPDATE product_variants SET
           ar_model_ios = $1,
           ar_model_android = $2,
           updated_at = NOW()
         WHERE variant_id = $3`,
        [v.arIos, v.arAndroid, v.variantId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[variants/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
