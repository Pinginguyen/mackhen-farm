ALTER TABLE "Product"
  ADD COLUMN "sensoryProfile" JSONB,
  ADD COLUMN "pairingGuide" JSONB,
  ADD COLUMN "originRegion" TEXT DEFAULT 'Sơn La, Tây Bắc',
  ADD COLUMN "waxSealCode" TEXT DEFAULT 'BATCH-CRAFT-2026';