import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: url });
  }
  return globalForDb.pool;
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  variant_id INTEGER UNIQUE NOT NULL,
  var_product_id INTEGER NOT NULL,
  ar_model_ios TEXT,
  ar_model_android TEXT,
  human_verified BOOLEAN NOT NULL DEFAULT FALSE,
  manual_incorrect BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS product_variants
  ADD COLUMN IF NOT EXISTS manual_incorrect BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_product_variants_variant_id ON product_variants(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_var_product_id ON product_variants(var_product_id);
`;

let initDone = false;

export async function ensureSchema(): Promise<void> {
  if (initDone) return;
  const pool = getPool();
  await pool.query(INIT_SQL);
  initDone = true;
}

export async function query<T = unknown>(
  text: string,
  values?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<T>(text, values);
  return { rows: result.rows ?? [], rowCount: result.rowCount ?? 0 };
}

export type ProductVariantRow = {
  id: number;
  variant_id: number;
  var_product_id: number;
  ar_model_ios: string | null;
  ar_model_android: string | null;
  human_verified: boolean;
  manual_incorrect: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};
