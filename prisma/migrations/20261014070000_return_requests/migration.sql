CREATE TYPE "ReturnRequestStatus" AS ENUM (
  'PENDING',
  'REPLACEMENT_APPROVED',
  'REFUNDED',
  'REJECTED'
);

CREATE TABLE "ReturnRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "issueType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "imageUrl" TEXT,
  "status" "ReturnRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status", "createdAt");
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");