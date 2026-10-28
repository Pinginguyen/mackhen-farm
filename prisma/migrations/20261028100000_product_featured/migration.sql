ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "Product_active_isFeatured_idx"
  ON "Product"("active", "isFeatured");