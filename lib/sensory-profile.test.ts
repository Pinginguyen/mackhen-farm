import { describe, expect, it } from 'vitest';
import { getSensoryProfile } from './sensory-profile';

describe('getSensoryProfile', () => {
  it('assigns the jerky profile by product name or slug', () => {
    expect(getSensoryProfile('Mắc Khén Xé Sợi Cay Nồng')?.metrics.map((metric) => metric.value)).toEqual([3, 4, 5]);
    expect(getSensoryProfile('Khác', 'mac-khen-chay-toi-gion-cay')?.metrics.map((metric) => metric.value)).toEqual([3, 4, 5]);
  });

  it('assigns forest seed and cham cheo salt profiles', () => {
    expect(getSensoryProfile('Hạt Dổi Rừng Nếp Thượng Hạng')?.metrics.map((metric) => metric.value)).toEqual([2, 5, 5]);
    expect(getSensoryProfile('Muối Chẳm Chéo Hạt Dổi Rang Khô')?.metrics.map((metric) => metric.value)).toEqual([4, 4, 5]);
  });

  it('leaves unrelated products without a guessed profile', () => {
    expect(getSensoryProfile('Chẳm Chéo Ướt Chuẩn Vị Điện Biên')).toBeNull();
  });
});