ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'REFUND_APPROVED';

ALTER TABLE "ReturnRequest"
  ADD COLUMN "refundApprovedBy" TEXT,
  ADD COLUMN "refundApprovedAt" TIMESTAMP(3),
  ADD COLUMN "refundTransferReference" TEXT;