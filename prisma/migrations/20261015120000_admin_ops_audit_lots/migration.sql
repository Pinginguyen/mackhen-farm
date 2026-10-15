CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetEntity" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_targetEntity_targetId_createdAt_idx" ON "AuditLog"("targetEntity", "targetId", "createdAt");
CREATE INDEX "AuditLog_adminEmail_createdAt_idx" ON "AuditLog"("adminEmail", "createdAt");

CREATE TABLE "ProductionLot" (
  "id" TEXT NOT NULL,
  "lotCode" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "mfgDate" TIMESTAMP(3) NOT NULL,
  "expDate" TIMESTAMP(3) NOT NULL,
  "receivedQty" INTEGER NOT NULL,
  "availableQty" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "testReportUrl" TEXT,
  "receivingNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionLot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductionLot_receivedQty_check" CHECK ("receivedQty" >= 0),
  CONSTRAINT "ProductionLot_availableQty_check" CHECK ("availableQty" >= 0 AND "availableQty" <= "receivedQty")
);
CREATE UNIQUE INDEX "ProductionLot_lotCode_key" ON "ProductionLot"("lotCode");
CREATE INDEX "ProductionLot_productId_status_expDate_idx" ON "ProductionLot"("productId", "status", "expDate");

ALTER TABLE "Order"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "lotCode" TEXT,
  ADD COLUMN "grossAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "netAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reconciled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

UPDATE "Order"
SET "grossAmount" = "subtotal" + "shipping",
    "netAmount" = "total";

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_holdExpiresAt_paymentStatus_orderStatus_idx" ON "Order"("holdExpiresAt", "paymentStatus", "status");