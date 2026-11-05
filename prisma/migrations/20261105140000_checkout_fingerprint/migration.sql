ALTER TABLE "Order" ADD COLUMN "checkoutFingerprint" TEXT;

CREATE INDEX "Order_checkoutFingerprint_createdAt_idx"
  ON "Order"("checkoutFingerprint", "createdAt");