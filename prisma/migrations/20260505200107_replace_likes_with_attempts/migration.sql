/*
  Warnings:

  - Added the required column `answer` to the `likes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `likes` ADD COLUMN `answer` VARCHAR(191) NOT NULL,
    ADD COLUMN `correct` BOOLEAN NOT NULL DEFAULT false;
