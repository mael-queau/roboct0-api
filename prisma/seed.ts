import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

seed();

async function seed() {
  const fakeTwitch = Array.from({ length: 100 }).map(() => {
    return {
      twitchId: faker.datatype
        .number({ min: 100000000, max: 999999999 })
        .toString(),
      username: faker.internet.userName(),
      registeredAt: faker.date.past(),
      token: faker.datatype.uuid(),
      refreshToken: faker.datatype.uuid(),
      enabled: faker.datatype.boolean(),
    };
  });

  await prisma.twitch.createMany({ data: fakeTwitch });
}
