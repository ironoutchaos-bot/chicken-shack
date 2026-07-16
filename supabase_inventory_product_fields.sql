-- B'LURU Fresh inventory product-card fields
-- Run this once in Supabase SQL Editor if discount / pack size values do not persist.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_percentage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight_per_unit DECIMAL(10,2);

UPDATE products
SET discount_percentage = 0
WHERE discount_percentage IS NULL;

