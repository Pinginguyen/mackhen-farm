CREATE TYPE "VoucherDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

ALTER TABLE "Order" ADD COLUMN "voucherCode" TEXT;

CREATE TABLE "Voucher" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discountType" "VoucherDiscountType" NOT NULL,
  "value" INTEGER NOT NULL,
  "maxDiscount" INTEGER,
  "minSpend" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "freeShipping" BOOLEAN NOT NULL DEFAULT false,
  "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Voucher_value_check" CHECK (("discountType" = 'PERCENTAGE' AND "value" BETWEEN 1 AND 100) OR ("discountType" = 'FIXED' AND "value" > 0)),
  CONSTRAINT "Voucher_minSpend_check" CHECK ("minSpend" >= 0),
  CONSTRAINT "Voucher_maxDiscount_check" CHECK ("maxDiscount" IS NULL OR "maxDiscount" > 0)
);

CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");
CREATE INDEX "Voucher_isActive_expiresAt_idx" ON "Voucher"("isActive", "expiresAt");

INSERT INTO "Voucher" ("id", "code", "discountType", "value", "maxDiscount", "minSpend", "isActive", "usedCount", "freeShipping", "firstOrderOnly", "createdAt", "updatedAt")
VALUES
  ('voucher-builtin-giam10', 'GIAM10', 'PERCENTAGE', 10, 30000, 150000, true, 0, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('voucher-builtin-freeship', 'FREESHIP', 'FIXED', 35000, NULL, 250000, true, 0, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
