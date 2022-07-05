import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Generate 100 random Twitch using faker and insert them in the database using Prisma
for (let i = 0; i < 100; i++) {
  const twitch = {
    twitchId: faker.datatype.uuid(),
    username: faker.internet.userName(),
    token: faker.datatype.uuid(),
    refreshToken: faker.datatype.uuid(),
    enabled: true,
  };
  prisma.twitch.create({
    data: twitch,
  });
}
