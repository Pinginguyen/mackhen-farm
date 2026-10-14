import { Communes, Districts, Provinces } from 'vietnam-divisions-js';

export type VietnamProvince = Awaited<ReturnType<typeof Provinces.getAllProvince>>[number];
export type VietnamDistrict = Awaited<ReturnType<typeof Districts.getAllDistricts>>[number];
export type VietnamCommune = Awaited<ReturnType<typeof Communes.getAllCommunes>>[number];

export type VietnamAddressData = {
  provinces: VietnamProvince[];
  districts: VietnamDistrict[];
  communes: VietnamCommune[];
};

let addressData: Promise<VietnamAddressData> | undefined;

export function getVietnamAddressData(): Promise<VietnamAddressData> {
  addressData ??= Promise.all([
    Provinces.getAllProvince(),
    Districts.getAllDistricts(),
    Communes.getAllCommunes(),
  ]).then(([provinces, districts, communes]) => ({ provinces, districts, communes }));
  return addressData;
}