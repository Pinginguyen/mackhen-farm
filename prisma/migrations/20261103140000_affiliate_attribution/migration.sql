ALTER TABLE "Order" ADD COLUMN "affiliateCode" TEXT;

CREATE INDEX "Order_affiliateCode_createdAt_idx" ON "Order"("affiliateCode", "createdAt");