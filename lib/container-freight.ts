export const MASTER_CARTON = {
  packs: 24,
  netWeightKg: 3.6,
  volumeCbm: 0.018,
} as const;

export const CONTAINER_20FT_CAPACITY_CBM = 33.2;

export function calculateContainerFreight(cartonCount: number, cartonsPerPallet: number) {
  const cartons = Math.max(0, Math.floor(cartonCount));
  const palletCapacity = Math.max(1, Math.floor(cartonsPerPallet));
  const totalVolumeCbm = cartons * MASTER_CARTON.volumeCbm;

  return {
    cartons,
    packs: cartons * MASTER_CARTON.packs,
    netWeightKg: cartons * MASTER_CARTON.netWeightKg,
    totalVolumeCbm,
    pallets: cartons ? Math.ceil(cartons / palletCapacity) : 0,
    containerFillPercent: Math.min(100, totalVolumeCbm / CONTAINER_20FT_CAPACITY_CBM * 100),
  };
}