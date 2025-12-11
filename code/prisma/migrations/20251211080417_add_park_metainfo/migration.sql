/*
  Warnings:

  - Added the required column `country` to the `NationalPark` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `NationalPark` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NationalPark" ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;
