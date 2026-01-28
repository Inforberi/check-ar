import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json(
        { error: "Missing query: ids=1,2,3" },
        { status: 400 }
      );
    }
    const variantIds = idsParam
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (variantIds.length === 0) {
      return NextResponse.json({});
    }

    const placeholders = variantIds.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await query<{
      variant_id: number;
      human_verified: boolean;
      manual_incorrect: boolean;
      notes: string | null;
    }>(
      `SELECT variant_id, human_verified, manual_incorrect, notes FROM product_variants WHERE variant_id IN (${placeholders})`,
      variantIds
    );

    const state: Record<
      number,
      { humanVerified: boolean; manualIncorrect: boolean; notes: string | null }
    > = {};
    for (const r of rows) {
      state[r.variant_id] = {
        humanVerified: r.human_verified,
        manualIncorrect: r.manual_incorrect,
        notes: r.notes,
      };
    }
    return NextResponse.json(state);
  } catch (err) {
    console.error("[variants/state]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get state" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const variantIds = body.variantIds as number[] | undefined;
    if (!Array.isArray(variantIds) || variantIds.length === 0) {
      return NextResponse.json(
        { error: "Expected { variantIds: number[] }" },
        { status: 400 }
      );
    }

    const placeholders = variantIds.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await query<{
      variant_id: number;
      human_verified: boolean;
      manual_incorrect: boolean;
      notes: string | null;
    }>(
      `SELECT variant_id, human_verified, manual_incorrect, notes FROM product_variants WHERE variant_id IN (${placeholders})`,
      variantIds
    );

    const state: Record<
      number,
      { humanVerified: boolean; manualIncorrect: boolean; notes: string | null }
    > = {};
    for (const r of rows) {
      state[r.variant_id] = {
        humanVerified: r.human_verified,
        manualIncorrect: r.manual_incorrect,
        notes: r.notes,
      };
    }
    return NextResponse.json(state);
  } catch (err) {
    console.error("[variants/state]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get state" },
      { status: 500 }
    );
  }
}
