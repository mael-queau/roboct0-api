import express from "express";
import "colors";
import dotenv from "dotenv/config";
import dotenvExpand from "dotenv-expand";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

prisma.channel
  .upsert({
    create: {
      channelId: "foo",
    },
    update: {
      channelId: "bar",
    },
    where: {
      channelId: "foo",
    },
  })
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.error(err);
  });

dotenvExpand.expand(dotenv);

const appPort = process.env.PORT ?? 3000;
const app = express();

app.get("/", (_req, res) => {
  res.status(200).send("Hello World!");
});

app.listen(appPort, () => {
  console.log(`🚀 Api listening on port ${appPort}!`.grey.bold);
});
