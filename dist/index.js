"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("dotenv/config"));
const dotenv_expand_1 = __importDefault(require("dotenv-expand"));
dotenv_expand_1.default.expand(config_1.default);
const appPort = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
const server = (0, express_1.default)();
const api = (0, express_1.default)();
server.use("/api", api);
server.set("env", process.env.NODE_ENV);
api.use(express_1.default.json());
api.use(express_1.default.urlencoded({ extended: true }));
api.use((req, res, next) => {
    if (req.headers["r0_key"] !== process.env.R0_KEY)
        res.sendStatus(401);
    else
        next();
});
server.get(`/`, (_req, res) => {
    res.send(`Je t'aime, Lisa 🥰😘❤️`);
});
const twitch_1 = __importDefault(require("./auth/twitch"));
server.use(twitch_1.default);
const v1_1 = __importDefault(require("./v1"));
api.use("/v1", v1_1.default);
server.listen(appPort, () => {
    console.log(`🚀 Api is listening on port ${appPort}!`.grey.bold);
});
