ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Product" SET "highlights" = ARRAY[
  '22.5g protein thực vật / 100g',
  'Khử mùi ngái đậu nành, đậm vị hạt dổi và mắc khén',
  'Sợi dai, cay nồng kiểu Tây Bắc'
] WHERE "slug" = 'mac-khen-xe-soi-cay-nong';

UPDATE "Product" SET "highlights" = ARRAY[
  '21g protein thực vật / 100g',
  'Miếng dẻo mềm, thấm vị mật mía',
  'Hương tiêu rừng Tây Bắc'
] WHERE "slug" = 'mac-khen-mieng-deo-tieu-rung';

UPDATE "Product" SET "highlights" = ARRAY[
  '23.8g protein thực vật / 100g',
  'Tỏi phi giòn thơm kết hợp mắc khén',
  'Vị giòn cay đậm đà'
] WHERE "slug" = 'mac-khen-chay-toi-gion-cay';

UPDATE "Product" SET "highlights" = ARRAY[
  '98g protein thực vật / hộp',
  'Đủ ba hương vị khô thực vật',
  'Hộp 450g thích hợp làm quà'
] WHERE "slug" = 'combo-bo-ba-nhau-xanh';

UPDATE "Product" SET "highlights" = ARRAY[
  'Công thức chẳm chéo chuẩn vị Điện Biên',
  'Vị cay thơm, dùng chấm món luộc và món nướng',
  'Hũ 250g tiện dùng trong bữa ăn'
] WHERE "slug" = 'cham-cheo-uot-chuan-vi-dien-bien';

UPDATE "Product" SET "highlights" = ARRAY[
  'Mắc khén rừng tuyển chọn từ Sơn La',
  'Rang khô dậy hương thơm đặc trưng',
  'Dùng làm chẳm chéo hoặc nêm món ăn'
] WHERE "slug" = 'hat-mac-khen-rung-sao-kho-son-la';

UPDATE "Product" SET "highlights" = ARRAY[
  'Hạt dổi rừng nếp tuyển chọn',
  'Hương thơm đặc trưng của núi rừng Tây Bắc',
  'Hũ thủy tinh 50g'
] WHERE "slug" = 'hat-doi-rung-nep-thuong-hang';

UPDATE "Product" SET "highlights" = ARRAY[
  'Muối chẳm chéo phối hạt dổi rang',
  'Vị mặn cay thơm, tiện chấm và nêm nếm',
  'Hũ rắc hai nấc 150g'
] WHERE "slug" = 'muoi-cham-cheo-hat-doi-rang-kho';