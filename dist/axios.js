"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordClient = exports.twitchClient = void 0;
const axios_1 = __importDefault(require("axios"));
exports.twitchClient = axios_1.default.create({
    baseURL: `https://api.twitch.tv/helix`,
    headers: {
        "Client-Id": `${process.env.TWITCH_ID}`,
    },
});
exports.discordClient = axios_1.default.create({
    baseURL: `https://discord.com/api/v10`,
    headers: {
        "Client-Id": `${process.env.DISCORD_ID}`,
    },
});
