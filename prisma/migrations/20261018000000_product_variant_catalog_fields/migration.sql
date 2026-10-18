ALTER TABLE "ProductVariant"
ADD COLUMN "originalPrice" INTEGER,
ADD COLUMN "sku" TEXT;

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");