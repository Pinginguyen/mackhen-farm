ALTER TABLE "Order" ADD COLUMN "sepayTransactionId" TEXT;

CREATE UNIQUE INDEX "Order_sepayTransactionId_key" ON "Order"("sepayTransactionId");