import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const variantId = body.variantId as number | undefined;
    const humanVerified = body.humanVerified as boolean | undefined;
    const notes = body.notes as string | undefined;
    const manualIncorrect = body.manualIncorrect as boolean | undefined;

    if (variantId == null || typeof variantId !== "number") {
      return NextResponse.json({
        error:
          "Expected { variantId: number, humanVerified?: boolean, manualIncorrect?: boolean, notes?: string }",
      }, { status: 400 });
    }

    if (humanVerified !== undefined) {
      await query(
        `UPDATE product_variants SET human_verified = $1, updated_at = NOW() WHERE variant_id = $2`,
        [humanVerified, variantId]
      );
    }
    if (manualIncorrect !== undefined) {
      await query(
        `UPDATE product_variants SET manual_incorrect = $1, updated_at = NOW() WHERE variant_id = $2`,
        [manualIncorrect, variantId]
      );
    }
    if (notes !== undefined) {
      await query(
        `UPDATE product_variants SET notes = $1, updated_at = NOW() WHERE variant_id = $2`,
        [notes || null, variantId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[variants/update]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
