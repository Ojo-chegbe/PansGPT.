/*
  Warnings:

  - You are about to drop the column `lecturer` on the `Timetable` table. All the data in the column will be lost.
  - You are about to drop the column `venue` on the `Timetable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Timetable" DROP COLUMN "lecturer",
DROP COLUMN "venue";
