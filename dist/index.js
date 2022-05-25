"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("colors");
const config_1 = __importDefault(require("dotenv/config"));
const dotenv_expand_1 = __importDefault(require("dotenv-expand"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
dotenv_expand_1.default.expand(config_1.default);
const appPort = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
const app = (0, express_1.default)();
app.get("/", (_req, res) => {
  res.status(200).send("Hello World!");
});
app.listen(appPort, () => {
  console.log(`🚀 Api listening on port ${appPort}!`.grey.bold);
});
