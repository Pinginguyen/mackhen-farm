CREATE TABLE "SiteAsset" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'STOREFRONT',
  "imageUrl" TEXT NOT NULL,
  "altText" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteAsset_key_key" ON "SiteAsset"("key");