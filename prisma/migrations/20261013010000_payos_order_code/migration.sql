CREATE SEQUENCE "Payment_orderCode_seq";
ALTER TABLE "Payment" ADD COLUMN "orderCode" INTEGER NOT NULL DEFAULT nextval('"Payment_orderCode_seq"'::regclass);
ALTER SEQUENCE "Payment_orderCode_seq" OWNED BY "Payment"."orderCode";
CREATE UNIQUE INDEX "Payment_orderCode_key" ON "Payment"("orderCode");