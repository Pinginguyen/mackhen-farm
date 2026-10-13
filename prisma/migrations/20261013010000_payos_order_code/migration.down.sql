DROP INDEX IF EXISTS "Payment_orderCode_key";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "orderCode";
DROP SEQUENCE IF EXISTS "Payment_orderCode_seq";