/*
  Warnings:

  - Added the required column `channelName` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "channelName" TEXT NOT NULL;
