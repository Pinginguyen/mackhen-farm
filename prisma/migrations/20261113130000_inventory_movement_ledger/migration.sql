CREATE TYPE "InventoryMovementType" AS ENUM (
  'RECEIPT',
  'RESERVATION',
  'RELEASE',
  'SHIPMENT',
  'RETURN',
  'ADJUSTMENT'
);

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "productId" TEXT NOT NULL,
  "productVariantId" TEXT,
  "productionLotId" TEXT,
  "orderId" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "delta" INTEGER NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryMovement_idempotencyKey_key" ON "InventoryMovement"("idempotencyKey");
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");
CREATE INDEX "InventoryMovement_productVariantId_createdAt_idx" ON "InventoryMovement"("productVariantId", "createdAt");
CREATE INDEX "InventoryMovement_productionLotId_createdAt_idx" ON "InventoryMovement"("productionLotId", "createdAt");
CREATE INDEX "InventoryMovement_orderId_createdAt_idx" ON "InventoryMovement"("orderId", "createdAt");

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productVariantId_fkey"
  FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productionLotId_fkey"
  FOREIGN KEY ("productionLotId") REFERENCES "ProductionLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;