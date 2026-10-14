export type NutritionValues = {
  calories: string;
  protein: string;
  fat: string;
  cholesterol: string;
  fiber: string;
  carbs: string;
  sodium: string;
};

export const NUTRITION_MAP: Record<string, NutritionValues> = {
  'mac-khen-xe-soi-cay-nong': { calories: '285 kcal', protein: '22.5g/100g', fat: '4.2g', cholesterol: '0 mg', fiber: '14.2g', carbs: '38.0g', sodium: '780 mg' },
  'mac-khen-mieng-deo-tieu-rung': { calories: '295 kcal', protein: '21.0g/100g', fat: '3.8g', cholesterol: '0 mg', fiber: '13.5g', carbs: '42.5g', sodium: '690 mg' },
  'mac-khen-chay-toi-gion-cay': { calories: '325 kcal', protein: '23.8g/100g', fat: '6.5g', cholesterol: '0 mg', fiber: '12.0g', carbs: '41.0g', sodium: '820 mg' },
  'combo-bo-ba-nhau-xanh': { calories: '301 kcal', protein: '22.4g/100g', fat: '4.8g', cholesterol: '0 mg', fiber: '13.2g', carbs: '40.5g', sodium: '760 mg' },
  'cham-cheo-uot-dien-bien': { calories: '68 kcal', protein: '2.2g/100g', fat: '1.1g', cholesterol: '0 mg', fiber: '3.5g', carbs: '11.5g', sodium: '1.950 mg' },
  'cham-cheo-uot-chuan-vi-dien-bien': { calories: '68 kcal', protein: '2.2g/100g', fat: '1.1g', cholesterol: '0 mg', fiber: '3.5g', carbs: '11.5g', sodium: '1.950 mg' },
  'hat-mac-khen-rung-sao-kho': { calories: '285 kcal', protein: '8.5g/100g', fat: '4.0g', cholesterol: '0 mg', fiber: '24.2g', carbs: '48.0g', sodium: '25 mg' },
  'hat-mac-khen-rung-sao-kho-son-la': { calories: '285 kcal', protein: '8.5g/100g', fat: '4.0g', cholesterol: '0 mg', fiber: '24.2g', carbs: '48.0g', sodium: '25 mg' },
  'hat-doi-rung-nep-thuong-hang': { calories: '315 kcal', protein: '11.2g/100g', fat: '14.5g', cholesterol: '0 mg', fiber: '18.0g', carbs: '35.0g', sodium: '18 mg' },
  'muoi-cham-cheo-hat-doi-rang-kho': { calories: '82 kcal', protein: '3.1g/100g', fat: '0.8g', cholesterol: '0 mg', fiber: '2.8g', carbs: '14.0g', sodium: '28.000 mg' },
};

export const FALLBACK_NUTRITION: NutritionValues = {
  calories: 'Xem trên bao bì',
  protein: 'Xem trên bao bì',
  fat: 'Xem trên bao bì',
  cholesterol: '0 mg',
  fiber: 'Xem trên bao bì',
  carbs: 'Xem trên bao bì',
  sodium: 'Xem trên bao bì',
};