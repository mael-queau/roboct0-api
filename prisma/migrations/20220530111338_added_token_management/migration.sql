/*
  Warnings:

  - You are about to drop the column `accessToken` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `expiresIn` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `lastRefresh` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `accessToken` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `expiresIn` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `lastRefresh` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `Guild` table. All the data in the column will be lost.
  - Added the required column `tokenId` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenId` to the `Guild` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TokenPlatform" AS ENUM ('TWITCH', 'DISCORD');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('authorization_code', 'client_credentials');

-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "accessToken",
DROP COLUMN "expiresIn",
DROP COLUMN "lastRefresh",
DROP COLUMN "refreshToken",
ADD COLUMN     "tokenId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Guild" DROP COLUMN "accessToken",
DROP COLUMN "expiresIn",
DROP COLUMN "lastRefresh",
DROP COLUMN "refreshToken",
ADD COLUMN     "tokenId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "refreshToken" TEXT,
    "refreshed" TIMESTAMP(3) NOT NULL,
    "expiresIn" TIMESTAMP(3) NOT NULL,
    "state" TEXT,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotToken" (
    "id" SERIAL NOT NULL,
    "platform" "TokenPlatform" NOT NULL,
    "tokenId" INTEGER NOT NULL,

    CONSTRAINT "BotToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BotToken_platform_key" ON "BotToken"("platform");

-- AddForeignKey
ALTER TABLE "BotToken" ADD CONSTRAINT "BotToken_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
