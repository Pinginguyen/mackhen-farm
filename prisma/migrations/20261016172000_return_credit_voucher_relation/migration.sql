ALTER TABLE "Voucher" ADD COLUMN "returnRequestId" TEXT;
CREATE UNIQUE INDEX "Voucher_returnRequestId_key" ON "Voucher"("returnRequestId");
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;