import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

for (let i = 0; i < 10; i++) {
  let identity = {
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
  };
  prisma.channel
    .create({
      data: {
        channelId: faker.unique(faker.datatype.number).toString(),
        channelLogin: faker.internet.userName(
          identity.firstName,
          identity.lastName
        ),
        channelName: `${identity.firstName} ${identity.lastName}`,
        token: {
          create: {
            token: faker.datatype.string(32),
            expiresIn: faker.date.between(
              "1970-01-01T00:00:00.000Z",
              "1970-01-01T00:30:00.000Z"
            ),
            type: "client_credentials",
          },
        },
      },
      include: {
        token: true,
      },
    })
    .then((result) => {
      console.log(result);
    })
    .catch((err) => {
      console.error(err);
    });
}
