CREATE TABLE "B2bInquiry" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "expectedVolume" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bInquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "B2bInquiry_status_createdAt_idx" ON "B2bInquiry"("status", "createdAt");
CREATE INDEX "B2bInquiry_email_createdAt_idx" ON "B2bInquiry"("email", "createdAt");