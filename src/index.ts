import express from "express";
import "colors";
import dotenv from "dotenv/config";
import dotenvExpand from "dotenv-expand";

dotenvExpand.expand(dotenv);

const appPort = process.env.API_PORT ?? 3000;
const app = express();

app.get("/", (_req, res) => {
  res.status(200).send("Hello World!");
});

app.listen(appPort, () => {
  console.log(`🚀 Api listening on port ${appPort}!`.grey.bold);
});
