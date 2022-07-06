import express from "express";
import dotenv from "dotenv/config";
import dotenvExpand from "dotenv-expand";
import { PrismaClient } from "@prisma/client";
import "colors";

dotenvExpand.expand(dotenv);

const server = express();
const port = process.env.PORT ?? "3000";

import api from "./api";
server.use("/api", api);

import { refreshToken, verifyTokens } from "./oauth/twitch";

const prisma = new PrismaClient();
prisma.state.deleteMany({});

verifyTokens().then((invalidChannels) => {
  invalidChannels.forEach(refreshToken);
});
setInterval(() => {
  verifyTokens().then((invalidChannels) => {
    invalidChannels.forEach(refreshToken);
  });
}, 3600000);

import oauth from "./oauth";
server.use("", oauth);

server.listen(port, () => {
  console.log(`🚀 API is listening on port ${port}`.dim);
});
