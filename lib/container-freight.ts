export const MASTER_CARTON = {
  packs: 24,
  netWeightKg: 3.6,
  volumeCbm: 0.018,
} as const;

export const CONTAINER_20FT_CAPACITY_CBM = 33.2;

export function calculateContainerFreight(
  cartonCount: number,
  cartonsPerPallet: number,
  carton: { packs: number; netWeightKg: number; volumeCbm: number } = MASTER_CARTON,
) {
  const cartons = Math.max(0, Math.floor(cartonCount));
  const palletCapacity = Math.max(1, Math.floor(cartonsPerPallet));
  const totalVolumeCbm = cartons * carton.volumeCbm;

  return {
    cartons,
    packs: cartons * carton.packs,
    netWeightKg: cartons * carton.netWeightKg,
    totalVolumeCbm,
    pallets: cartons ? Math.ceil(cartons / palletCapacity) : 0,
    containerFillPercent: Math.min(100, totalVolumeCbm / CONTAINER_20FT_CAPACITY_CBM * 100),
  };
}