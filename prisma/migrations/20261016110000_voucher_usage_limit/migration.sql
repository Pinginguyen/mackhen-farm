ALTER TABLE "Voucher" ADD COLUMN "usageLimit" INTEGER;
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_usageLimit_check" CHECK ("usageLimit" IS NULL OR "usageLimit" > 0);