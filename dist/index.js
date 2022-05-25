"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("colors");
const appPort = (_a = process.env.API_PORT) !== null && _a !== void 0 ? _a : 3000;
const app = (0, express_1.default)();
app.get("/", (_req, res) => {
    res.status(200).send("Hello World!");
});
app.listen(appPort, () => {
    console.log(`🚀 Api listening on port ${appPort}!`.grey.bold);
});
