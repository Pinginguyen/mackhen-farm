CREATE TABLE "RefundOperation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "returnRequestId" TEXT,
  "amount" INTEGER NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountHolder" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "transferReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefundOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefundOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RefundOperation_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RefundOperation_amount_check" CHECK ("amount" >= 0)
);
CREATE INDEX "RefundOperation_status_createdAt_idx" ON "RefundOperation"("status", "createdAt");
CREATE INDEX "RefundOperation_orderId_createdAt_idx" ON "RefundOperation"("orderId", "createdAt");