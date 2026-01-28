#!/usr/bin/env node
import pg from "pg";

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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await client.query(INIT_SQL);
  console.log("DB schema initialized (product_variants)");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
