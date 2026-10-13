CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "CheckoutPaymentMethod" AS ENUM ('COD', 'VIETQR');
CREATE TYPE "ShippingCarrier" AS ENUM ('GHTK', 'SPX');
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);
CREATE INDEX "Review_productId_createdAt_idx" ON "Review"("productId", "createdAt");

ALTER TABLE "Product"
  ADD COLUMN "protein" INTEGER,
  ADD COLUMN "calories" INTEGER,
  ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Product" SET "images" = ARRAY["image"];
UPDATE "Product" AS product
SET "stock" = LEAST(product."stock", variants."stock")
FROM (
  SELECT "productId", SUM("stock")::INTEGER AS "stock"
  FROM "ProductVariant"
  GROUP BY "productId"
) AS variants
WHERE product."id" = variants."productId";

CREATE SEQUENCE "Order_numericCode_seq" START WITH 100000;
ALTER TABLE "Order"
  ADD COLUMN "orderCode" TEXT,
  ADD COLUMN "numericCode" INTEGER,
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trackingCode" TEXT,
  ADD COLUMN "carrier" "ShippingCarrier";

WITH legacy_orders AS (
  SELECT "id", nextval('"Order_numericCode_seq"') AS "numericCode"
  FROM "Order"
)
UPDATE "Order" AS orders
SET "numericCode" = legacy_orders."numericCode",
    "orderCode" = 'MKF-' || lpad(legacy_orders."numericCode"::TEXT, 6, '0'),
    "customerName" = customers."name",
    "phone" = COALESCE(customers."phone", ''),
    "address" = COALESCE(customers."address", '')
FROM "Customer" AS customers, legacy_orders
WHERE orders."customerId" = customers."id" AND orders."id" = legacy_orders."id";

ALTER TABLE "Order"
  ALTER COLUMN "orderCode" SET NOT NULL,
  ALTER COLUMN "numericCode" SET DEFAULT nextval('"Order_numericCode_seq"'),
  ALTER COLUMN "numericCode" SET NOT NULL,
  ALTER COLUMN "customerName" SET NOT NULL,
  ALTER COLUMN "phone" SET NOT NULL,
  ALTER COLUMN "address" SET NOT NULL,
  ALTER COLUMN "paymentMethod" TYPE "CheckoutPaymentMethod"
    USING CASE WHEN lower("paymentMethod") = 'vietqr' THEN 'VIETQR'::"CheckoutPaymentMethod" ELSE 'COD'::"CheckoutPaymentMethod" END,
  ALTER COLUMN "customerId" DROP NOT NULL;
ALTER SEQUENCE "Order_numericCode_seq" OWNED BY "Order"."numericCode";

CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");
CREATE UNIQUE INDEX "Order_numericCode_key" ON "Order"("numericCode");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_phone_createdAt_idx" ON "Order"("phone", "createdAt");
ALTER TABLE "Order"
  DROP CONSTRAINT "Order_customerId_fkey",
  ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

SELECT setval('"Order_numericCode_seq"', GREATEST(99999, COALESCE((SELECT MAX("numericCode") FROM "Order"), 99999)));