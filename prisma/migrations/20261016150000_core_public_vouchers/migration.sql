ALTER TABLE "Voucher" ADD COLUMN "name" TEXT;

UPDATE "Voucher"
SET "name" = 'Ưu đãi thành viên mới - Đơn đầu tiên', "showOnPromoPage" = true
WHERE "code" = 'GIAM10';

UPDATE "Voucher"
SET "name" = 'Miễn phí vận chuyển toàn quốc', "showOnPromoPage" = true
WHERE "code" = 'FREESHIP';