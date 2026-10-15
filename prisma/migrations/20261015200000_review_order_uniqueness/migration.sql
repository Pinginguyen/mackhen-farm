ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "orderId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Review"
    ADD CONSTRAINT "Review_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_productId_key" ON "Review"("orderId", "productId");