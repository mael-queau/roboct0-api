import { Channel, PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

seed();

async function seed() {
  for (let i = 0; i < 10; i++) {
    await prisma.channel.create({
      data: {
        channelId: generateNumericId(9),
        username: faker.internet.userName(),
        registeredAt: faker.date.past(),
        token: faker.datatype.uuid(),
        refreshToken: faker.datatype.uuid(),
        enabled: faker.datatype.boolean(),
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    await prisma.guild.create({
      data: {
        guildId: generateNumericId(18),
        registeredAt: faker.date.past(),
        token: faker.datatype.uuid(),
        refreshToken: faker.datatype.uuid(),
        enabled: faker.datatype.boolean(),
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    const c = await prisma.$queryRaw<
      Channel[]
    >`SELECT * FROM "Channel" ORDER BY RANDOM() LIMIT 1`;

    const q = await prisma.quote.findFirst({
      orderBy: {
        quoteId: "desc",
      },
      where: {
        channelId: c[0].channelId,
      },
    });

    const id = q ? q.quoteId + 1 : 1;

    await prisma.quote.create({
      data: {
        quoteId: id,
        content: faker.lorem.sentence(),
        date: faker.date.past(),
        channelId: c[0].channelId,
        enabled: faker.datatype.boolean(),
      },
    });
  }
}

// Generate a string of 'length' numeric digits
function generateNumericId(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += faker.datatype.number({ min: 0, max: 9 });
  }
  // If the first digit is 0, change it to 1
  if (result[0] === "0") {
    result = "1" + result.substring(1);
  }
  return result;
}
