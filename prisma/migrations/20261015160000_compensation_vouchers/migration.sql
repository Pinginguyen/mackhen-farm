ALTER TYPE "ReturnRequestStatus" ADD VALUE 'VOUCHER_ISSUED';

CREATE TABLE "CompensationVoucher" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "returnRequestId" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "discountPercent" INTEGER NOT NULL DEFAULT 50,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompensationVoucher_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompensationVoucher_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CompensationVoucher_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CompensationVoucher_discountPercent_check" CHECK ("discountPercent" = 50)
);

CREATE UNIQUE INDEX "CompensationVoucher_code_key" ON "CompensationVoucher"("code");
CREATE UNIQUE INDEX "CompensationVoucher_returnRequestId_key" ON "CompensationVoucher"("returnRequestId");
CREATE INDEX "CompensationVoucher_customerPhone_expiresAt_redeemedAt_idx" ON "CompensationVoucher"("customerPhone", "expiresAt", "redeemedAt");
