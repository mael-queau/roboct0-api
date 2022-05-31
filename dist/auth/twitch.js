"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
const axios_1 = __importDefault(require("axios"));
const dayjs_1 = __importDefault(require("dayjs"));
const axios_2 = require("../axios");
const router = (0, express_1.Router)();
exports.default = router;
router.get("/twitch", async (_req, res) => {
    let url = `https://id.twitch.tv/oauth2/authorize`;
    url += `?client_id=${process.env.TWITCH_ID}`;
    url += `&redirect_uri=${encodeURI(`${process.env.API_URL}/twitch/callback`)}`;
    url += `&response_type=code`;
    let scopes = [
        "analytics:read:games",
        "bits:read",
        "channel:manage:broadcast",
        "channel:manage:polls",
        "channel:manage:predictions",
        "channel:manage:redemptions",
        "channel:read:goals",
        "channel:read:predictions",
        "channel:read:redemptions",
        "channel:read:subscriptions",
        "clips:edit",
        "moderation:read",
    ];
    url += `&scope=${encodeURI(scopes.join(" "))}`;
    let state = crypto_1.default.randomBytes(16).toString("hex");
    let insertState = await db_1.default.state.create({
        data: {
            value: state,
        },
        select: {
            value: true,
        },
    });
    url += `&state=${insertState.value}`;
    res.redirect(url);
});
router.route("/twitch/callback").get(async (req, res) => {
    const state = await db_1.default.state.findUnique({
        where: {
            value: `${req.query.state}`,
        },
        select: {
            value: true,
            createdAt: true,
        },
    });
    if (state && (0, dayjs_1.default)().diff(state.createdAt, "minutes") > 10) {
        db_1.default.state.delete({
            where: {
                value: state.value,
            },
        });
        res.status(400).send("This session has expired, please try again");
        return;
    }
    else
        console.log("State hasn't expired");
    if (req.query.error) {
        if (req.query.error === "access_denied")
            res.status(400).send("Operation aborted by the user");
        else
            res.sendStatus(500);
    }
    else if (req.query.code) {
        const code = req.query.code;
        let url = `https://id.twitch.tv/oauth2/token`;
        let params = new URLSearchParams();
        params.append("client_id", `${process.env.TWITCH_ID}`);
        params.append("client_secret", `${process.env.TWITCH_SECRET}`);
        params.append("code", `${code}`);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", encodeURI(`${process.env.API_URL}/twitch/callback`));
        axios_1.default
            .post(url, params)
            .then(async ({ data: tokenData }) => {
            const channelData = await getChannelFromToken(tokenData.access_token);
            console.log(channelData);
            db_1.default.channel
                .create({
                data: {
                    channelId: channelData.id,
                    channelName: channelData.display_name,
                    token: {
                        connectOrCreate: {
                            create: {
                                token: tokenData.access_token,
                                refreshToken: tokenData.refresh_token,
                                expiresIn: new Date(tokenData.expires_in),
                                type: "authorization_code",
                            },
                            where: {
                                token: tokenData.access_token,
                            },
                        },
                    },
                },
                include: { token: true },
            })
                .then((result) => {
                console.log(result);
                res
                    .status(201)
                    .send(`This channel was registered successfully. https://twitch.tv/${channelData.login} was registered.`);
            })
                .catch((err) => {
                console.error(err);
                res.sendStatus(500);
            });
        })
            .catch((err) => {
            console.error(err);
            res.sendStatus(500);
        });
    }
});
async function getChannelFromToken(token) {
    const res = await axios_2.twitchClient.get(`/users`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return res.data.data[0];
}
