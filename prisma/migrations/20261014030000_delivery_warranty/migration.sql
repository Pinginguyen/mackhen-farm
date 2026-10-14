ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);

CREATE TABLE "WarrantyRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarrantyRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarrantyRequest_orderId_key" UNIQUE ("orderId"),
  CONSTRAINT "WarrantyRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);