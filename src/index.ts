import "colors";
import express from "express";
import dotenv from "dotenv/config";
import dotenvExpand from "dotenv-expand";

dotenvExpand.expand(dotenv);

const appPort = process.env.PORT ?? 3000;
const server = express();
const api = express();

server.use("/api", api);
server.set("env", process.env.NODE_ENV);
api.use(express.json());
api.use(express.urlencoded({ extended: true }));

api.use((req, res, next) => {
  if (req.headers["r0_key"] !== process.env.R0_KEY) res.sendStatus(401);
  else next();
});

server.get(`/`, (_req, res) => {
  res.send(`Je t'aime, Lisa 🥰😘❤️`);
});

import twitch_auth from "./auth/twitch";
server.use(twitch_auth);

import api_v1 from "./v1";
api.use("/v1", api_v1);

server.listen(appPort, () => {
  console.log(`🚀 Api is listening on port ${appPort}!`.grey.bold);
});
