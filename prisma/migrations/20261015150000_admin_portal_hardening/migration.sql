ALTER TABLE "Order"
  ALTER COLUMN "shipping" TYPE DOUBLE PRECISION USING "shipping"::double precision,
  ALTER COLUMN "discountAmount" TYPE DOUBLE PRECISION USING "discountAmount"::double precision,
  ALTER COLUMN "grossAmount" TYPE DOUBLE PRECISION USING "grossAmount"::double precision,
  ALTER COLUMN "netAmount" TYPE DOUBLE PRECISION USING "netAmount"::double precision;

ALTER TABLE "OrderItem" ADD COLUMN "lotCode" TEXT;
ALTER TABLE "Review"
  ADD COLUMN "riskTag" TEXT,
  ADD COLUMN "riskAnalyzedAt" TIMESTAMP(3);
ALTER TABLE "ReturnRequest"
  ADD COLUMN "riskTag" TEXT,
  ADD COLUMN "riskAnalyzedAt" TIMESTAMP(3);

CREATE INDEX "OrderItem_lotCode_idx" ON "OrderItem"("lotCode");
CREATE INDEX "Review_riskTag_riskAnalyzedAt_createdAt_idx" ON "Review"("riskTag", "riskAnalyzedAt", "createdAt");
CREATE INDEX "ReturnRequest_riskTag_riskAnalyzedAt_createdAt_idx" ON "ReturnRequest"("riskTag", "riskAnalyzedAt", "createdAt");
