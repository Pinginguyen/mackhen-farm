CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "eventType" VARCHAR(24) NOT NULL,
    "sessionId" VARCHAR(36) NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FunnelEvent_eventType_createdAt_idx" ON "FunnelEvent"("eventType", "createdAt");
CREATE INDEX "FunnelEvent_sessionId_eventType_createdAt_idx" ON "FunnelEvent"("sessionId", "eventType", "createdAt");