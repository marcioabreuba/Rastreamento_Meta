/*
  Warnings:

  - You are about to drop the column `eventId` on the `Event` table. All the data in the column will be lost.

*/
-- RedefineTables
BEGIN;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN IF EXISTS "eventId";

COMMIT;
