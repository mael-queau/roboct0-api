-- CreateTable
CREATE TABLE "State" (
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "State_pkey" PRIMARY KEY ("value")
);

-- CreateTable
CREATE TABLE "Twitch" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "lastRefresh" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Twitch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "lastRefresh" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GuildToTwitch" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Twitch_twitchId_key" ON "Twitch"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildId_key" ON "Guild"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "_GuildToTwitch_AB_unique" ON "_GuildToTwitch"("A", "B");

-- CreateIndex
CREATE INDEX "_GuildToTwitch_B_index" ON "_GuildToTwitch"("B");

-- AddForeignKey
ALTER TABLE "_GuildToTwitch" ADD CONSTRAINT "_GuildToTwitch_A_fkey" FOREIGN KEY ("A") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GuildToTwitch" ADD CONSTRAINT "_GuildToTwitch_B_fkey" FOREIGN KEY ("B") REFERENCES "Twitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
