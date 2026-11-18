ALTER TABLE "User"
  ADD COLUMN "referralCode" TEXT;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

ALTER TABLE "Order"
  ADD COLUMN "referredByUserId" TEXT;

CREATE INDEX "Order_referredByUserId_createdAt_idx" ON "Order"("referredByUserId", "createdAt");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_referredByUserId_fkey"
  FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;