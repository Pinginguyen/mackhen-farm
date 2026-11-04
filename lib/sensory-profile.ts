export type SensoryMetric = {
  icon: string;
  labelVi: string;
  labelEn: string;
  value: number;
};

export type SensoryProfile = { metrics: SensoryMetric[] };

const jerkyProfile: SensoryProfile = {
  metrics: [
    { icon: '🌶️', labelVi: 'Độ cay', labelEn: 'Spiciness', value: 3 },
    { icon: '🥩', labelVi: 'Độ dai giòn', labelEn: 'Texture', value: 4 },
    { icon: '🌿', labelVi: 'Hương Mắc Khén', labelEn: 'Aroma', value: 4 },
  ],
};

const seedProfile: SensoryProfile = {
  metrics: [
    { icon: '🌶️', labelVi: 'Độ cay', labelEn: 'Spiciness', value: 2 },
    { icon: '🌿', labelVi: 'Đậm đà', labelEn: 'Richness', value: 5 },
    { icon: '✨', labelVi: 'Thơm rừng', labelEn: 'Forest aroma', value: 5 },
  ],
};

const saltProfile: SensoryProfile = {
  metrics: [
    { icon: '🌶️', labelVi: 'Độ cay', labelEn: 'Spiciness', value: 4 },
    { icon: '🧂', labelVi: 'Mặn mà', labelEn: 'Savory', value: 4 },
    { icon: '🌿', labelVi: 'Mắc khén', labelEn: 'Mac Khen aroma', value: 5 },
  ],
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[-_]+/g, ' ').toLocaleLowerCase('vi');
}

export function getSensoryProfile(name: string, slug = ''): SensoryProfile | null {
  const product = normalize(`${name} ${slug}`);
  if (product.includes('muoi cham cheo')) return saltProfile;
  if (product.includes('hat doi') || product.includes('hat mac khen') || product.includes('sao kho')) return seedProfile;
  if (product.includes('kho bo') || product.includes('xe soi') || product.includes('chay toi')) return jerkyProfile;
  return null;
}