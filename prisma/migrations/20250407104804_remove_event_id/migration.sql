/*
  Warnings:

  - You are about to drop the column `eventId` on the `Event` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventName" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userData" JSONB,
    "customData" JSONB,
    "serverData" JSONB,
    "pixelSent" BOOLEAN NOT NULL DEFAULT false,
    "cAPIsSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Event" ("cAPIsSent", "createdAt", "customData", "eventName", "eventTime", "id", "pixelSent", "serverData", "updatedAt", "userData") SELECT "cAPIsSent", "createdAt", "customData", "eventName", "eventTime", "id", "pixelSent", "serverData", "updatedAt", "userData" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
