import express from "express";
import dotenv from "dotenv/config";
import dotenvExpand from "dotenv-expand";
import "colors";

dotenvExpand.expand(dotenv);

const server = express();
const port = process.env.PORT ?? "3000";

import { refreshToken, verifyTokens } from "./oauth/twitch";
verifyTokens().then((invalidChannels) => {
  invalidChannels.forEach(refreshToken);
});
setInterval(() => {
  verifyTokens().then((invalidChannels) => {
    invalidChannels.forEach(refreshToken);
  });
}, 3600000);

import { router as router_twitch_oauth } from "./oauth/twitch";
server.use(router_twitch_oauth);

server.listen(port, () => {
  console.log(`🚀 API is listening on port ${port}`.grey.bold);
});
