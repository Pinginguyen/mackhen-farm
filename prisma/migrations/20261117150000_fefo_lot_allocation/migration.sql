ALTER TYPE "InventoryMovementType" ADD VALUE 'ALLOCATION';

ALTER TABLE "ProductionLot"
  ADD COLUMN "productVariantId" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN "lotId" TEXT;

UPDATE "OrderItem" item
SET "lotId" = lot."id"
FROM "ProductionLot" lot
WHERE item."lotCode" = lot."lotCode"
  AND item."lotId" IS NULL;

CREATE INDEX "ProductionLot_productVariantId_status_expDate_idx"
  ON "ProductionLot"("productVariantId", "status", "expDate");
CREATE INDEX "OrderItem_lotId_idx" ON "OrderItem"("lotId");

ALTER TABLE "ProductionLot"
  ADD CONSTRAINT "ProductionLot_productVariantId_fkey"
  FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_lotId_fkey"
  FOREIGN KEY ("lotId") REFERENCES "ProductionLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;