ALTER TABLE "Cart"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "checkoutCompletedAt" TIMESTAMP(3),
  ADD COLUMN "abandonmentEmailClaimedAt" TIMESTAMP(3),
  ADD COLUMN "abandonmentEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "abandonmentVoucherCode" TEXT;

CREATE INDEX "Cart_checkoutCompletedAt_abandonmentEmailSentAt_updatedAt_idx"
  ON "Cart"("checkoutCompletedAt", "abandonmentEmailSentAt", "updatedAt");

ALTER TABLE "Product" ADD COLUMN "unitCost" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "unitCostSnapshot" INTEGER;
ALTER TABLE "Order" ADD COLUMN "costOfGoods" INTEGER;