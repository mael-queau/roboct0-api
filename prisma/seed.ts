import { Channel, PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

seed();

async function seed() {
  for (let i = 0; i < 20; i++) {
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

  for (let i = 0; i < 20; i++) {
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
    const [c] = await prisma.$queryRaw<
      Channel[]
    >`SELECT * FROM "Channel" ORDER BY RANDOM() LIMIT 1`;

    await prisma.channel.update({
      where: {
        channelId: c.channelId,
      },
      data: {
        quoteIndex: c.quoteIndex + 1,
      },
    });

    await prisma.quote.create({
      data: {
        quoteId: c.quoteIndex,
        content: faker.lorem.sentence(),
        date: faker.date.past(),
        channelId: c.id,
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
