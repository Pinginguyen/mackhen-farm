CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');
ALTER TYPE "CheckoutPaymentMethod" ADD VALUE 'WALLET';

CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE UNIQUE INDEX "WalletTransaction_referenceId_key" ON "WalletTransaction"("referenceId");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "walletAmountSpent" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Review"
  ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rewardVoucherCode" TEXT;
CREATE UNIQUE INDEX "Review_rewardVoucherCode_key" ON "Review"("rewardVoucherCode");

ALTER TABLE "ProductionLot" ADD COLUMN "qrToken" TEXT;
UPDATE "ProductionLot" SET "qrToken" = gen_random_uuid()::text WHERE "qrToken" IS NULL;
ALTER TABLE "ProductionLot" ALTER COLUMN "qrToken" SET NOT NULL;
CREATE UNIQUE INDEX "ProductionLot_qrToken_key" ON "ProductionLot"("qrToken");