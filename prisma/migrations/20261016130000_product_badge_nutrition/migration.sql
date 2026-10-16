ALTER TABLE "Product" ADD COLUMN "badge" TEXT;
ALTER TABLE "Product" ADD COLUMN "nutritionFacts" JSONB;

UPDATE "Product"
SET "nutritionFacts" = '{"enabled":true,"servingSize":"Trên 100g","calories":"285 kcal","protein":"22.5g/100g","fat":"4.2g","cholesterol":"0 mg","fiber":"14.2g","carbohydrates":"38.0g","sodium":"780 mg"}'::jsonb
WHERE "slug" = 'mac-khen-xe-soi-cay-nong' AND "nutritionFacts" IS NULL;

UPDATE "Product"
SET "nutritionFacts" = '{"enabled":true,"servingSize":"Trên 100g","calories":"295 kcal","protein":"21.0g/100g","fat":"3.8g","cholesterol":"0 mg","fiber":"13.5g","carbohydrates":"42.5g","sodium":"690 mg"}'::jsonb
WHERE "slug" = 'mac-khen-mieng-deo-tieu-rung' AND "nutritionFacts" IS NULL;

UPDATE "Product"
SET "nutritionFacts" = '{"enabled":true,"servingSize":"Trên 100g","calories":"325 kcal","protein":"23.8g/100g","fat":"6.5g","cholesterol":"0 mg","fiber":"12.0g","carbohydrates":"41.0g","sodium":"820 mg"}'::jsonb
WHERE "slug" = 'mac-khen-chay-toi-gion-cay' AND "nutritionFacts" IS NULL;

UPDATE "Product"
SET "nutritionFacts" = '{"enabled":true,"servingSize":"Trên 100g","calories":"301 kcal","protein":"22.4g/100g","fat":"4.8g","cholesterol":"0 mg","fiber":"13.2g","carbohydrates":"40.5g","sodium":"760 mg"}'::jsonb
WHERE "slug" = 'combo-bo-ba-nhau-xanh' AND "nutritionFacts" IS NULL;