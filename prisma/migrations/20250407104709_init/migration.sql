-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventName" TEXT NOT NULL,
    "eventId" TEXT,
    "eventTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userData" JSONB,
    "customData" JSONB,
    "serverData" JSONB,
    "pixelSent" BOOLEAN NOT NULL DEFAULT false,
    "cAPIsSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
