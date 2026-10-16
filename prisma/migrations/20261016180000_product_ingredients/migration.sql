ALTER TABLE "Product" ADD COLUMN "ingredients" TEXT;

UPDATE "Product"
SET "ingredients" = CASE "slug"
	WHEN 'mac-khen-xe-soi-cay-nong' THEN 'Bã đậu nành upcycled, bột củ năng, hạt mắc khén, hạt dổi nướng, mật mía và gia vị Tây Bắc.'
	WHEN 'mac-khen-mieng-deo-tieu-rung' THEN 'Bã đậu nành upcycled, bột củ năng, mật mía, tiêu rừng, hạt mắc khén và gia vị Tây Bắc.'
	WHEN 'mac-khen-chay-toi-gion-cay' THEN 'Bã đậu nành upcycled, bột củ năng, tỏi phi, hạt mắc khén, hạt dổi nướng, mật mía và gia vị.'
	WHEN 'combo-bo-ba-nhau-xanh' THEN 'Gồm các vị khô thực vật: bã đậu nành upcycled, bột củ năng, hạt mắc khén, hạt dổi nướng, mật mía, tiêu rừng và tỏi phi.'
	WHEN 'cham-cheo-uot-chuan-vi-dien-bien' THEN 'Ớt tươi Điện Biên, tỏi nếp, rau thơm Tây Bắc, hạt dổi, mắc khén và gia vị.'
	WHEN 'hat-mac-khen-rung-sao-kho-son-la' THEN '100% hạt mắc khén rừng tự nhiên Tây Bắc, sàng lọc sạch cuống.'
	WHEN 'hat-doi-rung-nep-thuong-hang' THEN '100% hạt dổi rừng tự nhiên Tây Bắc, sàng lọc sạch cuống.'
	WHEN 'muoi-cham-cheo-hat-doi-rang-kho' THEN 'Muối, ớt, hạt dổi rang, mắc khén và rau thơm Tây Bắc; phối trộn và rang khô.'
	ELSE "ingredients"
END
WHERE "slug" IN (
	'mac-khen-xe-soi-cay-nong',
	'mac-khen-mieng-deo-tieu-rung',
	'mac-khen-chay-toi-gion-cay',
	'combo-bo-ba-nhau-xanh',
	'cham-cheo-uot-chuan-vi-dien-bien',
	'hat-mac-khen-rung-sao-kho-son-la',
	'hat-doi-rung-nep-thuong-hang',
	'muoi-cham-cheo-hat-doi-rang-kho'
);
