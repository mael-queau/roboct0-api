import express from "express";
import dotenv from "dotenv/config";
import dotenvExpand from "dotenv-expand";
import "colors";

dotenvExpand.expand(dotenv);

const server = express();
const port = process.env.PORT ?? "3000";

import router_oauth from "./oauth/index";
server.use(router_oauth);

server.listen(port, () => {
  console.log(`🚀 API is listening on port ${port}`.grey.bold);
});
