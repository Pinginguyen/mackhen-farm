CREATE TYPE "PointTransactionType" AS ENUM ('EARN', 'SPEND');

ALTER TABLE "User"
  ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "membershipTier" TEXT NOT NULL DEFAULT 'MEMBER';

ALTER TABLE "Order"
  ADD COLUMN "loyaltyPointsSpent" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Warehouse" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "province" TEXT,
  "district" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");
CREATE INDEX "Warehouse_active_province_district_idx" ON "Warehouse"("active", "province", "district");

ALTER TABLE "ProductionLot" ADD COLUMN "warehouseId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "warehouseId" TEXT;
CREATE INDEX "ProductionLot_warehouseId_status_expDate_idx" ON "ProductionLot"("warehouseId", "status", "expDate");
CREATE INDEX "InventoryMovement_warehouseId_createdAt_idx" ON "InventoryMovement"("warehouseId", "createdAt");
ALTER TABLE "ProductionLot" ADD CONSTRAINT "ProductionLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PointHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  "points" INTEGER NOT NULL,
  "type" "PointTransactionType" NOT NULL,
  "description" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PointHistory_idempotencyKey_key" ON "PointHistory"("idempotencyKey");
CREATE INDEX "PointHistory_userId_createdAt_idx" ON "PointHistory"("userId", "createdAt");
CREATE INDEX "PointHistory_orderId_type_idx" ON "PointHistory"("orderId", "type");
ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
