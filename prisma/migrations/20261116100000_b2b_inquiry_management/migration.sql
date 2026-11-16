ALTER TABLE "B2bInquiry" RENAME TO "b2b_inquiries";
ALTER TABLE "b2b_inquiries" RENAME CONSTRAINT "B2bInquiry_pkey" TO "b2b_inquiries_pkey";

ALTER TABLE "b2b_inquiries"
  RENAME COLUMN "companyName" TO "company_name";
ALTER TABLE "b2b_inquiries"
  RENAME COLUMN "contactName" TO "contact_name";
ALTER TABLE "b2b_inquiries"
  RENAME COLUMN "expectedVolume" TO "moq";
ALTER TABLE "b2b_inquiries"
  RENAME COLUMN "message" TO "notes";
ALTER TABLE "b2b_inquiries"
  RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "b2b_inquiries"
  ALTER COLUMN "country" TYPE VARCHAR(80),
  ALTER COLUMN "email" TYPE VARCHAR(254),
  ALTER COLUMN "phone" TYPE VARCHAR(32);
ALTER TABLE "b2b_inquiries"
  ADD COLUMN "admin_notes" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER INDEX "B2bInquiry_status_createdAt_idx"
  RENAME TO "b2b_inquiries_status_created_at_idx";
ALTER INDEX "B2bInquiry_email_createdAt_idx"
  RENAME TO "b2b_inquiries_email_created_at_idx";
