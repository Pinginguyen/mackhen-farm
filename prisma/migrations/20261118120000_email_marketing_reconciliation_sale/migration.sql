CREATE TYPE "BankTransferStatus" AS ENUM ('UNMATCHED', 'MISMATCH', 'MATCHED', 'MANUALLY_MATCHED');

ALTER TABLE "Product" ADD COLUMN "flashSaleEndsAt" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD COLUMN "reconciliationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reconciliationNote" TEXT,
  ADD COLUMN "orderConfirmationEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "shippingUpdateEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "reviewRequestEmailSentAt" TIMESTAMP(3);

CREATE TABLE "BankTransfer" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "orderCode" TEXT,
  "amount" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "status" "BankTransferStatus" NOT NULL DEFAULT 'UNMATCHED',
  "mismatchReason" TEXT,
  "orderId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankTransfer_transactionId_key" ON "BankTransfer"("transactionId");
CREATE UNIQUE INDEX "BankTransfer_idempotencyKey_key" ON "BankTransfer"("idempotencyKey");
CREATE INDEX "BankTransfer_status_receivedAt_idx" ON "BankTransfer"("status", "receivedAt");
CREATE INDEX "BankTransfer_orderId_receivedAt_idx" ON "BankTransfer"("orderId", "receivedAt");
CREATE INDEX "BankTransfer_orderCode_receivedAt_idx" ON "BankTransfer"("orderCode", "receivedAt");
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MarketingSubscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "unsubscribeToken" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingSubscriber_email_key" ON "MarketingSubscriber"("email");
CREATE UNIQUE INDEX "MarketingSubscriber_unsubscribeToken_key" ON "MarketingSubscriber"("unsubscribeToken");
CREATE INDEX "MarketingSubscriber_createdAt_idx" ON "MarketingSubscriber"("createdAt");
