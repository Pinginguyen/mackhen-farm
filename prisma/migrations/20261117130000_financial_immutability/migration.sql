CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'PAID', 'CANCELLED');

ALTER TABLE "User"
  ADD COLUMN "signupIpHash" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "affiliateCommissionStatus" "AffiliateCommissionStatus",
  ADD COLUMN "affiliateCommissionEligibleAt" TIMESTAMP(3);

ALTER TABLE "OrderItem"
  ADD COLUMN "titleSnapshot" TEXT,
  ADD COLUMN "variantNameSnapshot" TEXT,
  ADD COLUMN "skuSnapshot" TEXT,
  ADD COLUMN "discountAllocated" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "finalPrice" INTEGER;

WITH item_discounts AS (
  SELECT
    item."id",
    item."orderId",
    item."lineTotal",
    item."productId",
    item."productVariantId",
    item."productName",
    item."variantLabel",
    product."slug",
    variant."sku" AS "variantSku",
    CASE
      WHEN COALESCE(voucher."freeShipping", FALSE) THEN 0
      ELSE LEAST(order_record."discountAmount", order_record."subtotal")
    END AS "itemDiscount",
    order_record."subtotal"
  FROM "OrderItem" item
  JOIN "Order" order_record ON order_record."id" = item."orderId"
  JOIN "Product" product ON product."id" = item."productId"
  LEFT JOIN "ProductVariant" variant ON variant."id" = item."productVariantId"
  LEFT JOIN "Voucher" voucher ON voucher."code" = order_record."voucherCode"
), line_allocations AS (
  SELECT
    "id",
    "orderId",
    "lineTotal",
    COALESCE("variantSku", "slug") AS "skuSnapshot",
    "productName" AS "titleSnapshot",
    COALESCE("variantLabel", '') AS "variantNameSnapshot",
    CASE
      WHEN "subtotal" > 0 THEN FLOOR("itemDiscount"::numeric * "lineTotal" / "subtotal")::integer
      ELSE 0
    END AS "baseDiscount",
    ROW_NUMBER() OVER (PARTITION BY "orderId" ORDER BY "id") AS "lineNumber",
    "itemDiscount",
    "subtotal"
  FROM item_discounts
), allocated_lines AS (
  SELECT
    "id",
    "orderId",
    "lineTotal",
    "skuSnapshot",
    "titleSnapshot",
    "variantNameSnapshot",
    "baseDiscount",
    "baseDiscount" + CASE
      WHEN "lineNumber" <= "itemDiscount" - SUM("baseDiscount") OVER (PARTITION BY "orderId") THEN 1
      ELSE 0
    END AS "discountAllocated"
  FROM line_allocations
)
UPDATE "OrderItem" item
SET
  "titleSnapshot" = allocated."titleSnapshot",
  "variantNameSnapshot" = allocated."variantNameSnapshot",
  "skuSnapshot" = allocated."skuSnapshot",
  "discountAllocated" = allocated."discountAllocated",
  "finalPrice" = allocated."lineTotal" - allocated."discountAllocated"
FROM allocated_lines allocated
WHERE item."id" = allocated."id";

ALTER TABLE "OrderItem"
  ALTER COLUMN "titleSnapshot" SET NOT NULL,
  ALTER COLUMN "variantNameSnapshot" SET NOT NULL,
  ALTER COLUMN "finalPrice" SET NOT NULL;

UPDATE "Order" AS order_record
SET
  "affiliateCommissionStatus" = CASE
    WHEN order_record."status" IN ('CANCELLED', 'RETURNED') OR order_record."paymentStatus" = 'REFUNDED'
      OR EXISTS (
        SELECT 1 FROM "ReturnRequest" return_request
        WHERE return_request."orderId" = order_record."id"
          AND return_request."status" IN ('PENDING', 'REPLACEMENT_APPROVED', 'VOUCHER_ISSUED', 'REFUND_APPROVED', 'REFUNDED', 'COMPLETED')
      ) THEN 'CANCELLED'::"AffiliateCommissionStatus"
    WHEN order_record."affiliateCommissionPaidAt" IS NOT NULL THEN 'PAID'::"AffiliateCommissionStatus"
    WHEN order_record."deliveredAt" IS NOT NULL AND order_record."deliveredAt" + INTERVAL '7 days' <= CURRENT_TIMESTAMP THEN 'ELIGIBLE'::"AffiliateCommissionStatus"
    ELSE 'PENDING'::"AffiliateCommissionStatus"
  END,
  "affiliateCommissionEligibleAt" = CASE
    WHEN order_record."deliveredAt" IS NOT NULL THEN order_record."deliveredAt" + INTERVAL '7 days'
    ELSE NULL
  END
WHERE order_record."affiliateCode" IS NOT NULL;

CREATE INDEX "Order_affiliateCommissionStatus_affiliateCommissionEligibleAt_idx"
  ON "Order"("affiliateCommissionStatus", "affiliateCommissionEligibleAt");