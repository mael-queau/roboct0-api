/*
  Warnings:

  - Added the required column `accessToken` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresIn` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastRefresh` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accessToken` to the `Guild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresIn` to the `Guild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastRefresh` to the `Guild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `Guild` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "expiresIn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastRefresh" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "expiresIn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastRefresh" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL;
