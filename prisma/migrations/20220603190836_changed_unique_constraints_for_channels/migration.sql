/*
  Warnings:

  - A unique constraint covering the columns `[channelLogin]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `channelLogin` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "channelLogin" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_channelLogin_key" ON "Channel"("channelLogin");
